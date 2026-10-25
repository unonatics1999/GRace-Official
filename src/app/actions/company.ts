"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseDay } from "@/lib/dates";
import { db } from "@/lib/db";
import {
  BUSINESS_REQUIREMENTS,
  DOCUMENT_TYPES,
  INDIVIDUAL_REQUIREMENTS,
  type DocumentType,
} from "@/lib/requirements";
import { requireCompanyUser } from "@/lib/session";
import { saveDocument } from "@/lib/uploads";
import { canManageTeam, firstError, type ActionState } from "@/lib/util";

const phone = z
  .string()
  .trim()
  .regex(/^(\+63|0)\d{9,10}$/, "Enter a PH number, e.g. 09171234567 or +639171234567.");
const optionalDay = z
  .string()
  .default("")
  .refine((v) => v === "" || parseDay(v) !== null, "Enter a valid date.");

const common = {
  name: z.string().trim().min(2, "Enter the name."),
  city: z.string().trim().min(2, "Enter your city."),
  address: z.string().trim().min(5, "Enter the address.").max(300),
  phone,
  licenceNo: z
    .string()
    .trim()
    .toUpperCase()
    .default("")
    .refine((v) => v === "" || /^[A-Z]\d{2}-\d{2}-\d{6}$/.test(v), "Enter the licence number as printed, e.g. N01-23-456789."),
  licenceExpiry: optionalDay,
  payoutDetails: z.string().trim().max(300).default(""),
};

const individualSchema = z.object({
  ...common,
  govIdType: z.string().trim().min(3, "Pick the ID you're using."),
  govIdNumber: z.string().trim().min(4, "Enter the ID number.").max(40),
});

const businessSchema = z.object({
  ...common,
  registrationNo: z.string().trim().min(4, "Enter your DTI, SEC or CDA registration number.").max(40),
  tin: z
    .string()
    .trim()
    .regex(/^\d{3}-?\d{3}-?\d{3}(-?\d{3,5})?$/, "Enter your TIN, e.g. 123-456-789-000."),
});

/** Owners keep the verification details current. Changing identity details sends a verified account back to review. */
export async function updateAccountProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireCompanyUser();
  if (!canManageTeam(me.role)) return { error: "Only an owner can edit the account profile." };
  const c = me.company;
  const parsed = (c.kind === "INDIVIDUAL" ? individualSchema : businessSchema).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { licenceExpiry, ...rest } = parsed.data;
  if (rest.licenceNo && !licenceExpiry) return { error: "Add your licence expiry date." };
  const data = { ...rest, licenceExpiry: licenceExpiry ? parseDay(licenceExpiry) : null };

  const identityKeys = c.kind === "INDIVIDUAL" ? (["name", "govIdNumber"] as const) : (["name", "registrationNo", "tin"] as const);
  const identityChanged = identityKeys.some((k) => (data as Record<string, unknown>)[k] !== c[k]);
  const backToReview = identityChanged && c.status === "VERIFIED";

  await db.company.update({ where: { id: c.id }, data: { ...data, ...(backToReview ? { status: "PENDING" } : {}) } });
  revalidatePath("/account");
  return {
    ok: backToReview ? "Saved. Your identity details changed, so Downtime will review your account again." : "Profile saved.",
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
  revalidatePath("/account");
  return { ok: `${DOCUMENT_TYPES[docType]} uploaded.` };
}
