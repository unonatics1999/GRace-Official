import Link from "next/link";
import { redirect } from "next/navigation";
import { createVehicle } from "@/app/actions/vehicles";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { VEHICLE_TYPES } from "@/lib/constants";
import { requireCompanyUser } from "@/lib/session";
import { canManageFleet } from "@/lib/util";

export default async function NewVehiclePage() {
  const me = await requireCompanyUser();
  if (!canManageFleet(me.role)) redirect("/fleet");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/fleet" className="text-sm text-stone-500 hover:text-stone-900">← My fleet</Link>
      <h1 className="page-title mt-3">Add a vehicle</h1>
      <p className="mt-1 text-stone-500">You&apos;ll mark when it&apos;s idle on the next screen.</p>
      <div className="card mt-6 p-6">
        <ActionForm action={createVehicle} submitLabel="Save and set downtime" className="space-y-5">
          <Field label="Name" name="name" required placeholder="e.g. White Transit #2" />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Type</span>
              <select name="type" className="input" required defaultValue="">
                <option value="" disabled>Choose…</option>
                {Object.entries(VEHICLE_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <Field label="Year" name="year" type="number" required min={1990} max={2030} placeholder="2022" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pick-up city" name="city" required defaultValue={me.company.city} />
            <Field label="Daily rate (USD)" name="dailyRate" type="number" required min={10} max={2000} step="1" placeholder="90" />
          </div>
          <Field label="Equipment" name="equipment" placeholder="roof rack, liftgate, refrigeration" />
          <label className="block">
            <span className="label">Description</span>
            <textarea
              name="description"
              rows={4}
              maxLength={1000}
              className="input"
              placeholder="Payload, cargo dimensions, pick-up instructions, anything a renter should know."
            />
          </label>
          <p className="rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
            You keep 85% of your daily rate. Downtime&apos;s host fee is 15%, and renters pay a separate 10% service fee.
          </p>
        </ActionForm>
      </div>
    </div>
  );
}
