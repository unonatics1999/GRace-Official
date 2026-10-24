import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { VEHICLE_TYPES, type VehicleType } from "@/lib/constants";
import { db } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { canManageFleet, formatCents } from "@/lib/util";

export default async function VehiclesPage() {
  const me = await requireCompanyUser();
  const vehicles = await db.vehicle.findMany({
    where: { companyId: me.companyId },
    include: { _count: { select: { windows: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="page-title">My fleet</h1>
        {canManageFleet(me.role) && <Link href="/vehicles/new" className="btn-primary">Add a vehicle</Link>}
      </div>

      {vehicles.length === 0 ? (
        <EmptyState>No vehicles yet. Add one and mark when it sits idle.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <Link key={v.id} href={`/vehicles/${v.id}`} className="card block transition hover:border-brand-500">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{v.name}</p>
                  <p className="text-sm text-stone-500">
                    {v.year} {VEHICLE_TYPES[v.type as VehicleType]} · {v.city}
                  </p>
                </div>
                <span className={`badge ${v.active ? "bg-brand-100 text-brand-700" : "bg-stone-100 text-stone-600"}`}>
                  {v.active ? "Listed" : "Paused"}
                </span>
              </div>
              <p className="mt-4 text-lg font-semibold">
                {formatCents(v.dailyRateCents)}
                <span className="text-sm font-normal text-stone-500"> / day</span>
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {v._count.windows === 0 ? "No downtime set — not rentable yet" : `${v._count.windows} downtime window(s)`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
