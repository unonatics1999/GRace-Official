import Link from "next/link";
import { updateContact, updateVerification, uploadAccountDocument } from "@/app/actions/company";
import { ActionForm } from "@/components/ActionForm";
import { DocumentChecklist } from "@/components/DocumentChecklist";
import { CompanyStatusBadge, Field } from "@/components/ui";
import { ACCOUNT_KINDS, type AccountKind } from "@/lib/constants";
import { formatDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { BUSINESS_REQUIREMENTS, INDIVIDUAL_REQUIREMENTS, missingDocuments } from "@/lib/requirements";
import { requireCompanyUser } from "@/lib/session";
import { canManageTeam } from "@/lib/util";

export const metadata = { title: "Account · GRace Car Rental" };

const GOV_IDS = ["PhilSys National ID", "Passport", "Driver's licence", "UMID", "SSS ID", "Postal ID", "PRC ID"];

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string; verify?: string }> }) {
  const me = await requireCompanyUser();
  const { welcome, verify } = await searchParams;
  const c = me.company;
  const isOwner = canManageTeam(me.role);
  const individual = c.kind === "INDIVIDUAL";
  const requirements = individual ? INDIVIDUAL_REQUIREMENTS : BUSINESS_REQUIREMENTS;
  const documents = await db.document.findMany({ where: { companyId: c.id }, orderBy: { createdAt: "desc" } });
  const missing = missingDocuments(requirements, documents);
  const verified = c.status === "VERIFIED";
  // Open the verification section when the person came here for it or has already started.
  const openVerify = Boolean(verify) || documents.length > 0 || Boolean(c.govIdNumber || c.registrationNo) || verified;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {welcome && (
        <div className="rounded-2xl bg-brand-900 p-6 text-white">
          <p className="text-lg font-semibold">Welcome to GRace, {me.name.split(" ")[0]}.</p>
          <p className="mt-1 text-sm text-brand-100">
            {c.phone ? "You're all set to book a car with a driver." : "Add your mobile number and you can book a car with a driver right away."} No ID needed for that.
          </p>
          <Link href="/explore" className="mt-4 inline-flex rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-brand-900">Find a car</Link>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Your account</h1>
          <p className="mt-1 text-sm text-stone-500">{ACCOUNT_KINDS[c.kind as AccountKind]} account</p>
        </div>
        <CompanyStatusBadge status={c.status} />
      </div>

      {/* 1. Contact: all a with-driver renter needs */}
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">Contact details</h2>
            <p className="mt-1 text-sm text-stone-500">Enough to book a car <strong>with a driver</strong>. Your driver uses this number to reach you.</p>
          </div>
          {c.phone && <span className="badge bg-brand-100 text-brand-700">✓ Ready to book with a driver</span>}
        </div>
        {isOwner ? (
          <ActionForm action={updateContact} submitLabel="Save" className="mt-5 grid gap-4 sm:grid-cols-3 sm:items-end">
            <Field label={individual ? "Name" : "Business name"} name="name" defaultValue={c.name} required />
            <Field label="Mobile number" name="phone" type="tel" inputMode="tel" defaultValue={c.phone} placeholder="0917 123 4567" required />
            <Field label="City" name="city" defaultValue={c.city} />
          </ActionForm>
        ) : (
          <p className="mt-4 text-sm text-stone-600">Only an owner on this account can edit it.</p>
        )}
      </section>

      {/* 2. Verification: only for self-drive or listing a car */}
      <details open={openVerify} className="card group p-6">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <div>
            <h2 className="font-semibold">Verify your identity, for self-drive</h2>
            <p className="mt-1 text-sm text-stone-500">
              Only if you want to drive the car yourself{individual ? " or list your own car" : " or list your vehicles"}. Booking with a driver doesn&apos;t need this.
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2">
            {verified ? (
              <span className="badge bg-brand-100 text-brand-700">✓ Verified</span>
            ) : (
              <span className="badge bg-stone-100 text-stone-600">Optional</span>
            )}
            <span className="text-stone-400 transition group-open:rotate-45">+</span>
          </span>
        </summary>

        <div className="mt-6 space-y-8">
          <ol className="grid gap-2 text-sm sm:grid-cols-3">
            <Step n={1} done={Boolean(individual ? c.govIdNumber : c.registrationNo) && Boolean(c.address)} text="Enter your ID details" />
            <Step n={2} done={missing.length === 0} text={individual ? "Upload a photo of your ID" : "Upload your business papers"} />
            <Step n={3} done={verified} text="GRace checks it (1 business day)" />
          </ol>

          {isOwner && (
            <ActionForm action={updateVerification} submitLabel="Save ID details" className="space-y-4">
              {individual ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="label">ID you&apos;ll upload</span>
                    <select name="govIdType" defaultValue={c.govIdType} className="input" required>
                      <option value="" disabled>Choose one…</option>
                      {GOV_IDS.map((id) => <option key={id}>{id}</option>)}
                    </select>
                  </label>
                  <Field label="ID number" name="govIdNumber" defaultValue={c.govIdNumber} required />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="DTI / SEC / CDA registration no." name="registrationNo" defaultValue={c.registrationNo} required />
                  <Field label="BIR TIN" name="tin" defaultValue={c.tin} placeholder="123-456-789-000" required />
                </div>
              )}
              <Field label="Address (as on your ID)" name="address" defaultValue={c.address} placeholder="Street, barangay, city" required />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={individual ? "Driver's licence no." : "Driver's licence no. (employee who drives)"} name="licenceNo" defaultValue={c.licenceNo} placeholder="N01-23-456789" />
                <Field label="Licence expiry" name="licenceExpiry" type="date" defaultValue={c.licenceExpiry ? formatDay(c.licenceExpiry) : ""} />
              </div>
              <Field label="Payout details (only if you list a car)" name="payoutDetails" defaultValue={c.payoutDetails} placeholder="GCash 0917 123 4567, or bank and account number" />
            </ActionForm>
          )}

          <div>
            <h3 className="text-sm font-semibold">{individual ? "Your ID" : "Business documents"}</h3>
            <div className="mt-3">
              <DocumentChecklist requirements={requirements} uploaded={documents} upload={uploadAccountDocument} canUpload={isOwner} />
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

function Step({ done, n, text }: { done: boolean; n: number; text: string }) {
  return (
    <li className={`flex items-center gap-2 rounded-xl border p-3 ${done ? "border-brand-200 bg-brand-50 text-brand-700" : "border-stone-200 text-stone-700"}`}>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-500"}`}>
        {done ? "✓" : n}
      </span>
      {text}
    </li>
  );
}
