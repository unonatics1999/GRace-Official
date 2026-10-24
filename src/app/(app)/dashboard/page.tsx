import Link from "next/link";
import { Stat } from "@/components/ui";
import { db } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { formatCents } from "@/lib/util";

export default async function DashboardPage() {
  const me = await requireCompanyUser();
  const companyId = me.companyId;

  const [vehicles, idleListed, incoming, outgoing, earned] = await Promise.all([
    db.vehicle.count({ where: { companyId } }),
    db.vehicle.count({ where: { companyId, active: true, windows: { some: {} } } }),
    db.booking.count({ where: { status: "REQUESTED", vehicle: { companyId } } }),
    db.booking.count({ where: { status: { in: ["REQUESTED", "CONFIRMED"] }, renterCompanyId: companyId } }),
    db.booking.aggregate({
      where: { status: "CONFIRMED", vehicle: { companyId } },
      _sum: { subtotalCents: true, hostFeeCents: true },
    }),
  ]);
  const earnedCents = (earned._sum.subtotalCents ?? 0) - (earned._sum.hostFeeCents ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Welcome back, {me.name.split(" ")[0]}</h1>
        <p className="mt-1 text-stone-500">{me.company.name} · {me.company.city}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Earned from idle days" value={formatCents(earnedCents)} hint="Confirmed bookings, after fees" />
        <Stat label="Vehicles listed with downtime" value={`${idleListed} / ${vehicles}`} />
        <Stat label="Requests waiting on you" value={incoming} />
        <Stat label="Your active rentals" value={outgoing} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Earn from your fleet</h2>
          <p className="mt-1 text-sm text-stone-500">
            Add a vehicle, then mark the days it sits idle. Verified businesses can request it only on those days.
          </p>
          <Link href="/vehicles/new" className="btn-primary mt-4">Add a vehicle</Link>
        </div>
        <div className="card">
          <h2 className="font-semibold">Need a vehicle for a job?</h2>
          <p className="mt-1 text-sm text-stone-500">
            Rent a work-ready van or truck from a nearby business — billed to your company.
          </p>
          <Link href="/find" className="btn-secondary mt-4">Find a vehicle</Link>
        </div>
      </div>
    </div>
  );
}
