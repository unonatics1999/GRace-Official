import Link from "next/link";
import { setCompanyStatus } from "@/app/actions/admin";
import { ActionButton, AdminHeader } from "@/components/admin";
import { BookingStatusBadge, Stat } from "@/components/ui";
import { displayDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { listableWhere, vehicleTitle } from "@/lib/listings";
import { requireAdmin } from "@/lib/session";
import { formatCents } from "@/lib/util";

export default async function AdminOverview() {
  await requireAdmin();
  const [companies, liveListings, totalVehicles, bookingsByStatus, confirmed, pending, recent] = await Promise.all([
    db.company.groupBy({ by: ["status"], _count: true }),
    db.vehicle.count({ where: listableWhere() }),
    db.vehicle.count(),
    db.booking.groupBy({ by: ["status"], _count: true }),
    db.booking.aggregate({
      where: { status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] } },
      _sum: { vehicleCents: true, driverCents: true, renterFeeCents: true, hostFeeCents: true },
    }),
    db.company.findMany({
      where: { status: "PENDING" },
      include: { users: { where: { role: "OWNER" }, take: 1 } },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    db.booking.findMany({
      include: { vehicle: { include: { company: true } }, renterCompany: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const companyCount = (s: string) => companies.find((c) => c.status === s)?._count ?? 0;
  const bookingCount = (s: string) => bookingsByStatus.find((b) => b.status === s)?._count ?? 0;
  const sum = confirmed._sum;
  const gmv = (sum?.vehicleCents ?? 0) + (sum?.driverCents ?? 0) + (sum?.renterFeeCents ?? 0);
  const revenue = (sum?.renterFeeCents ?? 0) + (sum?.hostFeeCents ?? 0);
  const totalBookings = bookingsByStatus.reduce((n, b) => n + b._count, 0);

  return (
    <>
      <AdminHeader title="Overview" description="The marketplace at a glance. Money figures count paid bookings only." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Gross booking value" value={formatCents(gmv)} hint="Paid bookings, what renters paid" />
        <Stat label="Downtime revenue" value={formatCents(revenue)} hint="Service fees + host commission" />
        <Stat label="Verified accounts" value={companyCount("VERIFIED")} hint={`${companyCount("PENDING")} waiting for review`} />
        <Stat label="Live listings" value={`${liveListings} of ${totalVehicles}`} hint="Visible in search right now" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED", "IN_PROGRESS"] as const).map((s) => (
          <Link key={s} href={`/admin/bookings?status=${s}`} className="card flex items-center justify-between py-4 hover:border-brand-500">
            <BookingStatusBadge status={s} />
            <span className="text-xl font-semibold">{bookingCount(s)}</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Verification queue</h2>
            <Link href="/admin/companies?status=PENDING" className="text-sm text-brand-600 hover:underline">Open queue →</Link>
          </div>
          {pending.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">No companies waiting. Nice.</p>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100">
              {pending.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-stone-500">{c.city} · {c.users[0]?.email ?? "no owner"} · since {displayDay(c.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <ActionButton action={setCompanyStatus.bind(null, c.id, "REJECTED")} label="Reject" tone="danger" />
                    <ActionButton action={setCompanyStatus.bind(null, c.id, "VERIFIED")} label="Verify" tone="primary" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Latest bookings</h2>
            <Link href="/admin/bookings" className="text-sm text-brand-600 hover:underline">{totalBookings} total →</Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">No bookings yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100">
              {recent.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">{b.renterCompany.name} → {vehicleTitle(b.vehicle)}</p>
                    <p className="text-stone-500">
                      {b.vehicle.company.name} · {displayDay(b.startDate)} – {displayDay(b.endDate)} · {formatCents(b.vehicleCents + b.driverCents)}
                    </p>
                  </div>
                  <BookingStatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
