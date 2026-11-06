"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { invalidateListings } from "@/lib/listing-cache";
import {
  BUSINESS_REQUIREMENTS,
  DOCUMENT_TYPES,
  INDIVIDUAL_REQUIREMENTS,
  type DocumentType,
} from "@/lib/requirements";
import { PHONE_HINT, normalizePhone } from "@/lib/phone";
import { requireCompanyUser } from "@/lib/session";
import { saveDocument } from "@/lib/uploads";
import { audit } from "@/lib/audit";
import { sendMessage } from "@/lib/notify";
import { canManageTeam, firstError, type ActionState } from "@/lib/util";

const optionalDay = z
  .string()
  .default("")
  .refine((v) => v === "" || parseDay(v) !== null, "Enter a valid date.");

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  phone: z.string().default(""),
  city: z.string().trim().max(80).default(""),
});

/**
 * Name, mobile number and city: all a renter needs to book with a driver. No ID involved.
 * Renaming a verified account sends it back to review, since the name must match the ID.
 */
export async function updateContact(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireCompanyUser();
  if (!canManageTeam(me.role)) return { error: "Only an owner can edit the account." };
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { error: PHONE_HINT };

  const c = me.company;
  const backToReview = parsed.data.name !== c.name && c.status === "VERIFIED";
  await db.company.update({
    where: { id: c.id },
    data: { name: parsed.data.name, phone, city: parsed.data.city || c.city, ...(backToReview ? { status: "PENDING" } : {}) },
  });
  invalidateListings();
  revalidatePath("/account");
  return { ok: backToReview ? "Saved. Your name changed, so GRace will check it against your ID again." : "Saved. You can book with a driver now." };
}

const licence = {
  licenceNo: z
    .string()
    .trim()
    .toUpperCase()
    .default("")
    .refine((v) => v === "" || /^[A-Z]\d{2}-\d{2}-\d{6}$/.test(v), "Enter the licence number as printed, e.g. N01-23-456789."),
  licenceExpiry: optionalDay,
  address: z.string().trim().min(5, "Enter your address as on your ID.").max(300),
  payoutDetails: z.string().trim().max(300).default(""),
};

const individualSchema = z.object({
  ...licence,
  govIdType: z.string().trim().min(3, "Pick the ID you're using."),
  govIdNumber: z.string().trim().min(4, "Enter the ID number.").max(40),
});

const businessSchema = z.object({
  ...licence,
  registrationNo: z.string().trim().min(4, "Enter your DTI, SEC or CDA registration number.").max(40),
  tin: z
    .string()
    .trim()
    .regex(/^\d{3}-?\d{3}-?\d{3}(-?\d{3,5})?$/, "Enter your TIN, e.g. 123-456-789-000."),
});

/** Identity details, needed only for self-drive or to list a car. Changes send a verified account back to review. */
export async function updateVerification(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireCompanyUser();
  if (!canManageTeam(me.role)) return { error: "Only an owner can edit verification details." };
  const c = me.company;
  const parsed = (c.kind === "INDIVIDUAL" ? individualSchema : businessSchema).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { licenceExpiry, ...rest } = parsed.data;
  if (rest.licenceNo && !licenceExpiry) return { error: "Add your licence expiry date." };
  const data = { ...rest, licenceExpiry: licenceExpiry ? parseDay(licenceExpiry) : null };

  const identityKeys = c.kind === "INDIVIDUAL" ? (["govIdNumber", "licenceNo"] as const) : (["registrationNo", "tin", "licenceNo"] as const);
  const expiryChanged = (data.licenceExpiry?.getTime() ?? null) !== (c.licenceExpiry?.getTime() ?? null);
  const identityChanged = expiryChanged || identityKeys.some((k) => (data as Record<string, unknown>)[k] !== c[k]);
  const payoutChanged = "payoutDetails" in data && (data as { payoutDetails?: string }).payoutDetails !== c.payoutDetails;
  const backToReview = identityChanged && c.status === "VERIFIED";

  await db.company.update({ where: { id: c.id }, data: { ...data, ...(backToReview ? { status: "PENDING" } : {}) } });
  if (payoutChanged) {
    // Payouts are sent by hand to whatever is on file, so a change is recorded and the owner is told.
    await audit(me.id, "account.payout_details_changed", "Company", c.id);
    await sendMessage({
      toUserId: me.id,
      channel: "EMAIL",
      address: me.email,
      subject: "Your GRace payout details were changed",
      body: `Hi ${me.name},\n\nThe payout details on your GRace account were just changed. If you made this change, there's nothing to do.\n\nIf you didn't, reset your password right away and contact GRace support through the Help center.\n\nGRace Car Rental`,
    });
  }
  invalidateListings();
  revalidatePath("/account");
  return {
    ok: backToReview ? "Saved. Your ID details changed, so GRace will review them again." : "Saved. Upload the documents below if you haven't yet.",
  };
}

export async function uploadAccountDocument(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireCompanyUser();
  if (!canManageTeam(me.role)) return { error: "Only an owner can upload verification documents." };
  const requirements = me.company.kind === "INDIVIDUAL" ? INDIVIDUAL_REQUIREMENTS : BUSINESS_REQUIREMENTS;
  const docType = String(form.get("docType")) as DocumentType;
  if (!requirements.some((r) => r.doc === docType)) return { error: "Pick a document type." };
  const saved = await saveDocument(form.get("file"), `documents/accounts/${me.companyId}`, DOCUMENT_TYPES[docType]);
  if (!saved.ok) return { error: saved.error };
  await db.document.create({ data: { companyId: me.companyId, docType, ...saved.file } });
  invalidateListings();
  revalidatePath("/account");
  return { ok: `${DOCUMENT_TYPES[docType]} uploaded.` };
}
