import { redirect } from "next/navigation";
import { createVehicle } from "@/app/actions/vehicles";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { VEHICLE_TYPES } from "@/lib/constants";
import { requireCompanyUser } from "@/lib/session";
import { canManageFleet } from "@/lib/util";

export default async function NewVehiclePage() {
  const me = await requireCompanyUser();
  if (!canManageFleet(me.role)) redirect("/vehicles");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="page-title">Add a vehicle</h1>
      <p className="mt-1 text-stone-500">You&apos;ll set when it&apos;s idle on the next screen.</p>
      <div className="card mt-6">
        <ActionForm action={createVehicle} submitLabel="Save vehicle">
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
            <Field label="Year" name="year" type="number" required min={1990} max={2030} />
          </div>
          <Field label="Pick-up city" name="city" required defaultValue={me.company.city} />
          <Field label="Equipment" name="equipment" placeholder="roof rack, liftgate, refrigeration" />
          <Field label="Daily rate (USD)" name="dailyRate" type="number" required min={10} max={2000} step="1" />
          <p className="text-xs text-stone-500">You keep 85% of the rate; Downtime&apos;s fee is 15%.</p>
        </ActionForm>
      </div>
    </div>
  );
}
