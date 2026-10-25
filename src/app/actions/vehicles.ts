"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { FUEL_TYPES, TRANSMISSIONS, VEHICLE_TYPES, type VehicleType } from "@/lib/constants";
import { parseDay, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { DOCUMENT_TYPES, VEHICLE_REQUIREMENTS, VEHICLE_RULES, missingDocuments, type DocumentType } from "@/lib/requirements";
import { requireCompanyUser } from "@/lib/session";
import { saveDocument, saveImage } from "@/lib/uploads";
import { canManageFleet, firstError, type ActionState } from "@/lib/util";

const MAX_PHOTOS = 10;
const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];
const day = z.string().refine((v) => parseDay(v) !== null, "Enter a valid date.");
const peso = (min: number, max: number, label: string) =>
  z.coerce.number().min(min, `${label} must be at least ₱${min.toLocaleString()}.`).max(max, `${label} is capped at ₱${max.toLocaleString()}.`);

const vehicleSchema = z.object({
  type: z.enum(keys(VEHICLE_TYPES), { message: "Pick a vehicle type." }),
  make: z.string().trim().min(2, "Enter the make, e.g. Toyota.").max(40),
  model: z.string().trim().min(1, "Enter the model, e.g. Vios.").max(40),
  year: z.coerce.number().int().min(new Date().getFullYear() - VEHICLE_RULES.maxAgeYears, `Vehicles must be ${VEHICLE_RULES.maxAgeYears} years old or newer.`).max(new Date().getFullYear() + 1, "Enter a valid year."),
  color: z.string().trim().min(3, "Enter the colour.").max(30),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1c1c1c"),
  plateNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,3}\s?\d{3,4}$|^\d{3,4}\s?[A-Z]{2,3}$/, "Enter the plate as on the CR, e.g. NBC 1234."),
  seats: z.coerce.number().int().min(2).max(30),
  transmission: z.enum(keys(TRANSMISSIONS)),
  fuelType: z.enum(keys(FUEL_TYPES)),
  city: z.string().trim().min(2, "Enter the pick-up city."),
  equipment: z.string().trim().max(200).default(""),
  description: z.string().trim().max(1000).default(""),
  registrationExpiry: day,
  insuranceExpiry: day,
  dailyRate: peso(500, 50_000, "The daily rate"),
  selfDriveAllowed: z.preprocess((v) => v === "on", z.boolean()),
  withDriverAllowed: z.preprocess((v) => v === "on", z.boolean()),
  driverDailyRate: z.coerce.number().min(0).max(10_000).default(0),
});

function vehicleData(form: FormData) {
  const parsed = vehicleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) } as const;
  const v = parsed.data;
  if (!v.selfDriveAllowed && !v.withDriverAllowed) return { error: "Offer self-drive, with driver, or both." } as const;
  if (v.withDriverAllowed && v.driverDailyRate < 500) return { error: "Set a driver rate of at least ₱500 a day." } as const;
  const registrationExpiry = parseDay(v.registrationExpiry)!;
  const insuranceExpiry = parseDay(v.insuranceExpiry)!;
  if (registrationExpiry < today()) return { error: "The LTO registration has expired. Renew it before listing." } as const;
  if (insuranceExpiry < today()) return { error: "The CTPL insurance has expired. Renew it before listing." } as const;
  const { dailyRate, driverDailyRate, ...rest } = v;
  return {
    data: {
      ...rest,
      type: rest.type as VehicleType,
      plateNumber: rest.plateNumber.replace(/\s+/g, " "),
      equipment: rest.equipment.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).join(","),
      registrationExpiry,
      insuranceExpiry,
      dailyRateCents: Math.round(dailyRate * 100),
      driverDailyRateCents: v.withDriverAllowed ? Math.round(driverDailyRate * 100) : 0,
    },
  } as const;
}

export async function createVehicle(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireCompanyUser();
  if (!canManageFleet(me.role)) return { error: "Your role can't add vehicles." };
  const result = vehicleData(form);
  if ("error" in result) return { error: result.error };

  // The owner drives their own car by default, once their driver profile exists.
  const driver = await db.driver.findUnique({ where: { userId: me.id } });
  const vehicle = await db.vehicle.create({
    data: { ...result.data, companyId: me.companyId, driverId: driver?.id ?? null, reviewStatus: "DRAFT" },
  });
  redirect(`/fleet/${vehicle.id}`);
}

async function ownVehicle(vehicleId: string) {
  const me = await requireCompanyUser();
  if (!canManageFleet(me.role)) return null;
  const vehicle = await db.vehicle.findFirst({ where: { id: vehicleId, companyId: me.companyId } });
  return vehicle ? { me, vehicle } : null;
}

/** Editing the listing details. Approved vehicles go back to review when legal details change. */
export async function updateVehicle(vehicleId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const owned = await ownVehicle(vehicleId);
  if (!owned) return { error: "You can't edit this vehicle." };
  const result = vehicleData(form);
  if ("error" in result) return { error: result.error };
  const v = owned.vehicle;
  const legalChange = result.data.plateNumber !== v.plateNumber || result.data.make !== v.make || result.data.model !== v.model || result.data.year !== v.year;
  await db.vehicle.update({
    where: { id: v.id },
    data: { ...result.data, ...(legalChange && v.reviewStatus === "APPROVED" ? { reviewStatus: "SUBMITTED" } : {}) },
  });
  revalidatePath(`/fleet/${v.id}`);
  return { ok: legalChange && v.reviewStatus === "APPROVED" ? "Saved. Plate or model changed, so Downtime will review it again." : "Saved." };
}

export async function uploadVehiclePhotos(vehicleId: string, form: FormData): Promise<ActionState> {
  const owned = await ownVehicle(vehicleId);
  if (!owned) return { error: "You can't edit this vehicle." };
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one photo." };
  const existing = await db.vehiclePhoto.count({ where: { vehicleId } });
  if (existing + files.length > MAX_PHOTOS) return { error: `Up to ${MAX_PHOTOS} photos per vehicle.` };

  for (const [i, file] of files.entries()) {
    const saved = await saveImage(file, `vehicles/${vehicleId}`, `Photo ${i + 1}`);
    if (!saved.ok) return { error: saved.error };
    await db.vehiclePhoto.create({ data: { vehicleId, ...saved.file, position: existing + i } });
  }
  revalidatePath(`/fleet/${vehicleId}`);
  return { ok: `${files.length} photo${files.length === 1 ? "" : "s"} added.` };
}

export async function deleteVehiclePhoto(photoId: string): Promise<void> {
  const photo = await db.vehiclePhoto.findUnique({ where: { id: photoId } });
  if (!photo || !(await ownVehicle(photo.vehicleId))) return;
  await db.vehiclePhoto.delete({ where: { id: photo.id } });
  revalidatePath(`/fleet/${photo.vehicleId}`);
}

/** Moves a photo to the front, making it the cover. */
export async function makeCoverPhoto(photoId: string): Promise<void> {
  const photo = await db.vehiclePhoto.findUnique({ where: { id: photoId } });
  if (!photo || !(await ownVehicle(photo.vehicleId))) return;
  const photos = await db.vehiclePhoto.findMany({ where: { vehicleId: photo.vehicleId }, orderBy: { position: "asc" } });
  const ordered = [photo, ...photos.filter((p) => p.id !== photo.id)];
  await db.$transaction(ordered.map((p, i) => db.vehiclePhoto.update({ where: { id: p.id }, data: { position: i } })));
  revalidatePath(`/fleet/${photo.vehicleId}`);
}

export async function uploadVehicleDocument(vehicleId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const owned = await ownVehicle(vehicleId);
  if (!owned) return { error: "You can't edit this vehicle." };
  const docType = String(form.get("docType")) as DocumentType;
  if (!VEHICLE_REQUIREMENTS.some((r) => r.doc === docType)) return { error: "Pick a document type." };
  const saved = await saveDocument(form.get("file"), `documents/vehicles/${vehicleId}`, DOCUMENT_TYPES[docType]);
  if (!saved.ok) return { error: saved.error };
  await db.document.create({ data: { vehicleId, docType, ...saved.file } });
  revalidatePath(`/fleet/${vehicleId}`);
  return { ok: `${DOCUMENT_TYPES[docType]} uploaded.` };
}

/** Sends a draft (or a vehicle with changes requested) to Downtime for review. */
export async function submitVehicleForReview(vehicleId: string): Promise<void> {
  const owned = await ownVehicle(vehicleId);
  if (!owned) return;
  const v = await db.vehicle.findUnique({
    where: { id: vehicleId },
    include: { documents: true, driver: true, _count: { select: { photos: true, windows: true } } },
  });
  if (!v || !["DRAFT", "REJECTED"].includes(v.reviewStatus)) return;
  const ready =
    v._count.photos >= 3 &&
    v._count.windows > 0 &&
    missingDocuments(VEHICLE_REQUIREMENTS, v.documents).length === 0 &&
    (!v.withDriverAllowed || v.driver !== null);
  if (!ready) redirect(`/fleet/${vehicleId}?error=incomplete`);
  await db.vehicle.update({ where: { id: vehicleId }, data: { reviewStatus: "SUBMITTED", reviewNote: "" } });
  revalidatePath(`/fleet/${vehicleId}`);
}

export async function toggleVehicleActive(vehicleId: string): Promise<void> {
  const owned = await ownVehicle(vehicleId);
  if (!owned) return;
  await db.vehicle.update({ where: { id: vehicleId }, data: { active: !owned.vehicle.active } });
  revalidatePath(`/fleet/${vehicleId}`);
}

/** Links the owner's own driver profile to this vehicle. */
export async function assignMeAsDriver(vehicleId: string): Promise<void> {
  const owned = await ownVehicle(vehicleId);
  if (!owned) return;
  const driver = await db.driver.findUnique({ where: { userId: owned.me.id } });
  if (!driver) redirect("/driver");
  await db.vehicle.update({ where: { id: vehicleId }, data: { driverId: driver.id } });
  revalidatePath(`/fleet/${vehicleId}`);
}

export async function addWindow(vehicleId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const owned = await ownVehicle(vehicleId);
  if (!owned) return { error: "You can't edit this vehicle." };

  const kind = form.get("kind");
  const startDate = parseDay(form.get("startDate") as string);
  const endDate = parseDay(form.get("endDate") as string);
  const weekdays = form
    .getAll("weekdays")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

  if (startDate && endDate && endDate < startDate) return { error: "The end date is before the start date." };

  if (kind === "WEEKLY") {
    if (weekdays.length === 0) return { error: "Tick at least one weekday." };
    await db.downtimeWindow.create({ data: { vehicleId, kind, weekdays: weekdays.sort().join(","), startDate, endDate } });
  } else if (kind === "RANGE") {
    if (!startDate || !endDate) return { error: "A date range needs both a start and an end date." };
    await db.downtimeWindow.create({ data: { vehicleId, kind, startDate, endDate } });
  } else {
    return { error: "Pick weekly or date range." };
  }
  revalidatePath(`/fleet/${vehicleId}`);
  return { ok: "Availability added." };
}

export async function deleteWindow(windowId: string): Promise<void> {
  const window = await db.downtimeWindow.findUnique({ where: { id: windowId } });
  if (!window || !(await ownVehicle(window.vehicleId))) return;
  await db.downtimeWindow.delete({ where: { id: window.id } });
  revalidatePath(`/fleet/${window.vehicleId}`);
}
