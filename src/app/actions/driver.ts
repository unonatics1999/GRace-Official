"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseDay, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { invalidateListings } from "@/lib/listing-cache";
import { DOCUMENT_TYPES, DRIVER_REQUIREMENTS, VEHICLE_RULES, type DocumentType } from "@/lib/requirements";
import { requireCompanyUser } from "@/lib/session";
import { saveDocument } from "@/lib/uploads";
import { firstError, type ActionState, formFields } from "@/lib/util";

const driverSchema = z.object({
  licenceNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]\d{2}-\d{2}-\d{6}$/, "Enter the licence number as printed, e.g. N01-23-456789."),
  licenceType: z.literal("PROFESSIONAL", { message: "Driving for hire needs an LTO Professional licence." }),
  licenceExpiry: z.string().refine((v) => parseDay(v) !== null, "Enter the licence expiry date."),
  yearsExperience: z.coerce
    .number()
    .int()
    .min(VEHICLE_RULES.minDriverExperienceYears, `At least ${VEHICLE_RULES.minDriverExperienceYears} years of driving experience is required.`)
    .max(60),
});

/** Create or update the signed-in person's driver profile. Changes send it back to review. */
export async function saveDriverProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireCompanyUser();
  const parsed = driverSchema.safeParse(formFields(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const licenceExpiry = parseDay(parsed.data.licenceExpiry)!;
  if (licenceExpiry <= today()) return { error: "Your licence has expired. Renew it at LTO first." };

  const data = { ...parsed.data, licenceExpiry };
  const existing = await db.driver.findUnique({ where: { userId: me.id } });
  if (existing) {
    const changed = existing.licenceNo !== data.licenceNo || existing.licenceExpiry.getTime() !== licenceExpiry.getTime();
    await db.driver.update({
      where: { id: existing.id },
      data: { ...data, ...(changed && existing.status === "APPROVED" ? { status: "PENDING" } : {}) },
    });
  } else {
    const driver = await db.driver.create({ data: { ...data, userId: me.id } });
    // Owners drive their own vehicles by default.
    await db.vehicle.updateMany({ where: { companyId: me.companyId, driverId: null }, data: { driverId: driver.id } });
  }
  invalidateListings();
  revalidatePath("/driver");
  return { ok: "Driver profile saved." };
}

export async function uploadDriverDocument(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireCompanyUser();
  const driver = await db.driver.findUnique({ where: { userId: me.id } });
  if (!driver) return { error: "Save your licence details first." };
  const docType = String(form.get("docType")) as DocumentType;
  if (!DRIVER_REQUIREMENTS.some((r) => r.doc === docType)) return { error: "Pick a document type." };
  const saved = await saveDocument(form.get("file"), `documents/drivers/${driver.id}`, DOCUMENT_TYPES[docType]);
  if (!saved.ok) return { error: saved.error };
  await db.document.create({ data: { driverId: driver.id, docType, ...saved.file } });
  invalidateListings();
  revalidatePath("/driver");
  return { ok: `${DOCUMENT_TYPES[docType]} uploaded.` };
}
