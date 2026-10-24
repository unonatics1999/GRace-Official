import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { VehicleArt } from "@/components/VehicleArt";
import { VEHICLE_TYPES, type VehicleType } from "@/lib/constants";
import { db } from "@/lib/db";
import { describeDowntime } from "@/lib/listings";
import { requireCompanyUser } from "@/lib/session";
import { canManageFleet, formatCents } from "@/lib/util";

export default async function FleetPage() {
  const me = await requireCompanyUser();
  const vehicles = await db.vehicle.findMany({
    where: { companyId: me.companyId },
    include: { windows: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">My fleet</h1>
          <p className="mt-1 text-sm text-stone-500">Vehicles show in search only on the days you mark as downtime.</p>
        </div>
        {canManageFleet(me.role) && <Link href="/fleet/new" className="btn-primary">Add a vehicle</Link>}
      </div>

      {vehicles.length === 0 ? (
        <EmptyState>
          No vehicles yet. Add one and mark when it sits idle.
          {canManageFleet(me.role) && (
            <div className="mt-4">
              <Link href="/fleet/new" className="btn-primary">Add your first vehicle</Link>
            </div>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => {
            const status = v.blocked
              ? { label: "Hidden by Downtime", tone: "bg-red-100 text-red-700" }
              : !v.active
                ? { label: "Paused", tone: "bg-stone-100 text-stone-600" }
                : v.windows.length === 0
                  ? { label: "Needs downtime", tone: "bg-amber-100 text-amber-800" }
                  : { label: "Listed", tone: "bg-brand-100 text-brand-700" };
            return (
              <Link
                key={v.id}
                href={`/fleet/${v.id}`}
                className="group overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <VehicleArt type={v.type} seed={v.id} className="aspect-[16/9]" />
                <div className="space-y-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{v.name}</p>
                    <span className={`badge shrink-0 ${status.tone}`}>{status.label}</span>
                  </div>
                  <p className="text-sm text-stone-500">
                    {v.year} {VEHICLE_TYPES[v.type as VehicleType]} · {v.city}
                  </p>
                  <div className="flex items-center justify-between pt-2 text-sm">
                    <span className="text-brand-600">{describeDowntime(v.windows)}</span>
                    <span className="font-semibold">{formatCents(v.dailyRateCents)}<span className="font-normal text-stone-500">/day</span></span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
