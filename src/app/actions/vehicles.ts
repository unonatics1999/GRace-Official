"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { invalidateListings } from "@/lib/listing-cache";
import { DOCUMENT_TYPES, VEHICLE_REQUIREMENTS, missingDocuments, type DocumentType } from "@/lib/requirements";
import { vehicleData } from "@/lib/vehicle-input";
import { requireCompanyUser } from "@/lib/session";
import { saveDocument, saveImage } from "@/lib/uploads";
import { canManageFleet, type ActionState } from "@/lib/util";

const MAX_PHOTOS = 10;
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
  invalidateListings();
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
  invalidateListings();
  revalidatePath(`/fleet/${vehicleId}`);
  return { ok: `${files.length} photo${files.length === 1 ? "" : "s"} added.` };
}

export async function deleteVehiclePhoto(photoId: string): Promise<void> {
  const photo = await db.vehiclePhoto.findUnique({ where: { id: photoId } });
  if (!photo || !(await ownVehicle(photo.vehicleId))) return;
  await db.vehiclePhoto.delete({ where: { id: photo.id } });
  invalidateListings();
  revalidatePath(`/fleet/${photo.vehicleId}`);
}

/** Moves a photo to the front, making it the cover. */
export async function makeCoverPhoto(photoId: string): Promise<void> {
  const photo = await db.vehiclePhoto.findUnique({ where: { id: photoId } });
  if (!photo || !(await ownVehicle(photo.vehicleId))) return;
  const photos = await db.vehiclePhoto.findMany({ where: { vehicleId: photo.vehicleId }, orderBy: { position: "asc" } });
  const ordered = [photo, ...photos.filter((p) => p.id !== photo.id)];
  await db.$transaction(ordered.map((p, i) => db.vehiclePhoto.update({ where: { id: p.id }, data: { position: i } })));
  invalidateListings();
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
  invalidateListings();
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
  invalidateListings();
  revalidatePath(`/fleet/${vehicleId}`);
}

export async function toggleVehicleActive(vehicleId: string): Promise<void> {
  const owned = await ownVehicle(vehicleId);
  if (!owned) return;
  await db.vehicle.update({ where: { id: vehicleId }, data: { active: !owned.vehicle.active } });
  invalidateListings();
  revalidatePath(`/fleet/${vehicleId}`);
}

/** Links the owner's own driver profile to this vehicle. */
export async function assignMeAsDriver(vehicleId: string): Promise<void> {
  const owned = await ownVehicle(vehicleId);
  if (!owned) return;
  const driver = await db.driver.findUnique({ where: { userId: owned.me.id } });
  if (!driver) redirect("/driver");
  await db.vehicle.update({ where: { id: vehicleId }, data: { driverId: driver.id } });
  invalidateListings();
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
  invalidateListings();
  revalidatePath(`/fleet/${vehicleId}`);
  return { ok: "Availability added." };
}

export async function deleteWindow(windowId: string): Promise<void> {
  const window = await db.downtimeWindow.findUnique({ where: { id: windowId } });
  if (!window || !(await ownVehicle(window.vehicleId))) return;
  await db.downtimeWindow.delete({ where: { id: window.id } });
  invalidateListings();
  revalidatePath(`/fleet/${window.vehicleId}`);
}
