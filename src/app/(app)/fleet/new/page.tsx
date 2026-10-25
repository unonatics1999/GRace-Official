import Link from "next/link";
import { redirect } from "next/navigation";
import { createVehicle } from "@/app/actions/vehicles";
import { VehicleForm } from "@/components/VehicleForm";
import { VEHICLE_RULES } from "@/lib/requirements";
import { requireCompanyUser } from "@/lib/session";
import { canManageFleet } from "@/lib/util";

export const metadata = { title: "List a vehicle · Downtime" };

export default async function NewVehiclePage() {
  const me = await requireCompanyUser();
  if (!canManageFleet(me.role)) redirect("/fleet");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/fleet" className="text-sm text-stone-500 hover:text-stone-900">← My fleet</Link>
      <h1 className="page-title mt-3">List a vehicle</h1>
      <p className="mt-1 text-stone-500">
        Step 1 of 2: the details. Next you&apos;ll add photos, your OR/CR and CTPL, and when it&apos;s available. Vehicles must be{" "}
        {VEHICLE_RULES.maxAgeYears} years old or newer.
      </p>
      <div className="card mt-6 p-6">
        <VehicleForm action={createVehicle} defaultCity={me.company.city} submitLabel="Save and continue" />
      </div>
    </div>
  );
}
