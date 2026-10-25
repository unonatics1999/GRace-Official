import { updateAccountProfile, uploadAccountDocument } from "@/app/actions/company";
import { ActionForm } from "@/components/ActionForm";
import { DocumentChecklist } from "@/components/DocumentChecklist";
import { CompanyStatusBadge, Field } from "@/components/ui";
import { ACCOUNT_KINDS, type AccountKind } from "@/lib/constants";
import { formatDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { BUSINESS_REQUIREMENTS, INDIVIDUAL_REQUIREMENTS, missingDocuments } from "@/lib/requirements";
import { requireCompanyUser } from "@/lib/session";
import { canManageTeam } from "@/lib/util";

export const metadata = { title: "Account · Downtime" };

const GOV_IDS = ["PhilSys National ID", "Passport", "UMID", "Driver's licence", "SSS ID", "Postal ID", "PRC ID"];

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const me = await requireCompanyUser();
  const { welcome } = await searchParams;
  const c = me.company;
  const isOwner = canManageTeam(me.role);
  const individual = c.kind === "INDIVIDUAL";
  const requirements = individual ? INDIVIDUAL_REQUIREMENTS : BUSINESS_REQUIREMENTS;
  const documents = await db.document.findMany({ where: { companyId: c.id }, orderBy: { createdAt: "desc" } });
  const missing = missingDocuments(requirements, documents);
  const profileComplete = Boolean(c.phone && c.address && (individual ? c.govIdNumber : c.registrationNo && c.tin));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {welcome && (
        <div className="rounded-2xl bg-brand-900 p-6 text-white">
          <p className="text-lg font-semibold">Welcome to Downtime, {me.name.split(" ")[0]}.</p>
          <p className="mt-1 text-sm text-brand-100">
            You can already book a car with a driver: just add your mobile number below. To drive yourself or list your own car, upload your ID and we&apos;ll verify you within one business day.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">{c.name}</h1>
          <p className="mt-1 text-sm text-stone-500">{ACCOUNT_KINDS[c.kind as AccountKind]} account · {c.city}</p>
        </div>
        <CompanyStatusBadge status={c.status} />
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        <Step done={Boolean(c.phone)} n={1} text="Add your mobile number: book with a driver" />
        <Step done={missing.length === 0 && profileComplete} n={2} text="Upload your ID and details" />
        <Step done={c.status === "VERIFIED"} n={3} text="Verified: self-drive and listing unlocked" />
      </ol>

      <section className="card p-6">
        <h2 className="font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-stone-500">Must match your documents exactly.</p>
        {isOwner ? (
          <ActionForm action={updateAccountProfile} submitLabel="Save profile" className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={individual ? "Full name" : "Registered business name"} name="name" defaultValue={c.name} required />
              <Field label="Mobile / phone" name="phone" defaultValue={c.phone} placeholder="09171234567" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" name="city" defaultValue={c.city} required />
              <Field label="Address" name="address" defaultValue={c.address} placeholder="Street, barangay, city" required />
            </div>
            {individual ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Government ID</span>
                  <select name="govIdType" defaultValue={c.govIdType} className="input" required>
                    <option value="" disabled>Choose…</option>
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
            <fieldset className="rounded-xl bg-stone-50 p-4">
              <legend className="px-1 text-sm font-medium">Driver&apos;s licence for self-drive bookings</legend>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <Field label="Licence no." name="licenceNo" defaultValue={c.licenceNo} placeholder="N01-23-456789" />
                <Field label="Expiry" name="licenceExpiry" type="date" defaultValue={c.licenceExpiry ? formatDay(c.licenceExpiry) : ""} />
              </div>
              <p className="mt-2 text-xs text-stone-500">
                {individual ? "Your own licence." : "The licence of the employee who will drive."} Leave blank if you only book with a driver.
              </p>
            </fieldset>
            <Field label="Payout details (if you list a car)" name="payoutDetails" defaultValue={c.payoutDetails} placeholder="GCash 0917 123 4567, or bank name and account number" />
          </ActionForm>
        ) : (
          <p className="mt-4 text-sm text-stone-600">Only an owner on this account can edit the profile.</p>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">Verification documents</h2>
        <p className="mt-1 text-sm text-stone-500">
          Only needed to drive yourself or to list a car. Booking with a driver needs no ID. Clear photos or PDF scans.
        </p>
        <div className="mt-5">
          <DocumentChecklist requirements={requirements} uploaded={documents} upload={uploadAccountDocument} canUpload={isOwner} />
        </div>
      </section>
    </div>
  );
}

function Step({ done, n, text }: { done: boolean; n: number; text: string }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl border p-4 text-sm ${done ? "border-brand-200 bg-brand-50" : "border-stone-200 bg-white"}`}>
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-500"}`}>
        {done ? "✓" : n}
      </span>
      <span className={done ? "text-brand-700" : "text-stone-700"}>{text}</span>
    </li>
  );
}
