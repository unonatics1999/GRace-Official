import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { VehicleImage } from "@/components/VehicleImage";
import { REVIEW_STATUS } from "@/lib/constants";
import { today } from "@/lib/dates";
import { db } from "@/lib/db";
import { describeDowntime, vehicleTitle } from "@/lib/listings";
import { requireCompanyUser } from "@/lib/session";
import { canManageFleet, formatCents } from "@/lib/util";

export const metadata = { title: "My fleet · Downtime" };

export default async function FleetPage() {
  const me = await requireCompanyUser();
  const vehicles = await db.vehicle.findMany({
    where: { companyId: me.companyId },
    include: { windows: true, photos: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  const now = today();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">My fleet</h1>
          <p className="mt-1 text-sm text-stone-500">Each vehicle is reviewed by Downtime before it goes live.</p>
        </div>
        {canManageFleet(me.role) && <Link href="/fleet/new" className="btn-primary">List a vehicle</Link>}
      </div>

      {vehicles.length === 0 ? (
        <EmptyState>
          No vehicles yet. List your car and earn on the days you don&apos;t use it.
          {canManageFleet(me.role) && (
            <div className="mt-4"><Link href="/fleet/new" className="btn-primary">List your first vehicle</Link></div>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => {
            const lapsed = v.registrationExpiry < now || v.insuranceExpiry < now;
            const status = v.blocked
              ? { label: "Hidden by Downtime", tone: "bg-red-100 text-red-700" }
              : lapsed
                ? { label: "Papers expired", tone: "bg-red-100 text-red-700" }
                : v.reviewStatus !== "APPROVED"
                  ? { label: REVIEW_STATUS[v.reviewStatus as keyof typeof REVIEW_STATUS], tone: v.reviewStatus === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800" }
                  : !v.active
                    ? { label: "Paused", tone: "bg-stone-100 text-stone-600" }
                    : { label: "Live", tone: "bg-brand-100 text-brand-700" };
            return (
              <Link key={v.id} href={`/fleet/${v.id}`} className="group overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md">
                <VehicleImage vehicle={v} className="aspect-[16/10]" />
                <div className="space-y-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{vehicleTitle(v)}</p>
                    <span className={`badge shrink-0 ${status.tone}`}>{status.label}</span>
                  </div>
                  <p className="text-sm text-stone-500">{v.color} · {v.plateNumber} · {v.city}</p>
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
