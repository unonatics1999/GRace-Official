import type { Company, User } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { ACCOUNT_KINDS, COMPANY_STATUS, ROLES } from "@/lib/constants";
import { formatDay } from "@/lib/dates";
import type { ActionState } from "@/lib/util";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

function Select({ label, name, value, options }: { label: string; name: string; value?: string; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select name={name} defaultValue={value} className="input">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

/** Every account field. With `withOwner`, also creates the account's first login. */
export function AccountForm({ action, account: c, withOwner, submitLabel }: { action: Action; account?: Company; withOwner?: boolean; submitLabel: string }) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account name" name="name" defaultValue={c?.name} required />
        <Field label="City" name="city" defaultValue={c?.city} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Select label="Type" name="accountType" value={c?.accountType ?? "RENTER"} options={[["RENTER", "Renter"], ["OWNER", "Car owner"]]} />
        <Select label="Person or business" name="kind" value={c?.kind ?? "INDIVIDUAL"} options={Object.entries(ACCOUNT_KINDS)} />
        <Select label="Status" name="status" value={c?.status ?? "PENDING"} options={Object.entries(COMPANY_STATUS)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mobile number" name="phone" defaultValue={c?.phone} placeholder="0917 123 4567" />
        <Field label="Address" name="address" defaultValue={c?.address} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Government ID type" name="govIdType" defaultValue={c?.govIdType} />
        <Field label="Government ID number" name="govIdNumber" defaultValue={c?.govIdNumber} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="DTI / SEC / CDA no." name="registrationNo" defaultValue={c?.registrationNo} />
        <Field label="TIN" name="tin" defaultValue={c?.tin} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Licence no." name="licenceNo" defaultValue={c?.licenceNo} />
        <Field label="Licence expiry" name="licenceExpiry" type="date" defaultValue={c?.licenceExpiry ? formatDay(c.licenceExpiry) : ""} />
        <Field label="Payout details" name="payoutDetails" defaultValue={c?.payoutDetails} />
      </div>
      {withOwner && (
        <fieldset className="rounded-xl bg-stone-50 p-4">
          <legend className="px-1 text-sm font-semibold">First login for this account</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-3">
            <Field label="Owner name" name="ownerName" required />
            <Field label="Owner email" name="ownerEmail" type="email" required />
            <Field label="Temporary password" name="ownerPassword" type="text" minLength={10} autoComplete="off" required />
          </div>
          <p className="mt-2 text-xs text-stone-500">Share the temporary password privately; they can change it under Email &amp; password.</p>
        </fieldset>
      )}
    </ActionForm>
  );
}

/** A login: belongs to an account, or is a GRace admin. */
export function UserForm({
  action,
  user: u,
  accounts,
  submitLabel,
  creating,
}: {
  action: Action;
  user?: User;
  accounts: { id: string; name: string }[];
  submitLabel: string;
  creating?: boolean;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" defaultValue={u?.name} required />
        <Field label="Email" name="email" type="email" defaultValue={u?.email} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Account</span>
          <select name="companyId" defaultValue={u?.companyId ?? ""} className="input">
            <option value="">None (admin)</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <Select label="Role in the account" name="role" value={u?.role ?? "OWNER"} options={Object.entries(ROLES)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isAdmin" defaultChecked={u?.isAdmin} className="accent-[#1f5139]" />
        GRace admin (full access to this console)
      </label>
      <Field
        label={creating ? "Temporary password" : "Reset password (leave blank to keep)"}
        name="password"
        type="text"
        minLength={10}
        autoComplete="off"
        required={creating}
      />
    </ActionForm>
  );
}

/** Confirmed delete: a button inside a disclosure so it can't be hit by accident. */
export function DangerZone({ action, what, note }: { action: () => Promise<void>; what: string; note: string }) {
  return (
    <details className="rounded-xl border border-red-200 bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold text-red-700">Delete {what}</summary>
      <p className="mt-3 text-sm text-stone-600">{note}</p>
      <form action={action} className="mt-4">
        <button className="btn-danger">Yes, permanently delete {what}</button>
      </form>
    </details>
  );
}

/** Owner picker (when creating) and review status, shown above the vehicle form in the admin console. */
export function AdminVehicleFields({ accounts, account, review = "DRAFT" }: { accounts?: { id: string; name: string }[]; account?: string; review?: string }) {
  return (
    <fieldset className="grid gap-4 rounded-xl bg-stone-50 p-4 sm:grid-cols-2">
      <legend className="px-1 text-sm font-semibold">Admin</legend>
      {accounts && (
        <label className="block">
          <span className="label">Owner account</span>
          <select name="companyId" defaultValue={account ?? ""} className="input" required>
            <option value="" disabled>Choose…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      )}
      <label className="block">
        <span className="label">Review status</span>
        <select name="reviewStatus" defaultValue={review} className="input">
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Under review</option>
          <option value="APPROVED">Approved (live once it has availability)</option>
          <option value="REJECTED">Changes needed</option>
        </select>
      </label>
    </fieldset>
  );
}
