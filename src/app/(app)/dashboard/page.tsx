import Link from "next/link";
import { BookingStatusBadge, EmptyState, Stat } from "@/components/ui";
import { displayDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { listableWhere, vehicleTitle } from "@/lib/listings";
import { requireOwner } from "@/lib/session";
import { formatCents } from "@/lib/util";

export default async function DashboardPage() {
  const me = await requireOwner();
  const companyId = me.companyId;

  const [vehicles, listed, incoming, outgoing, earned, recent] = await Promise.all([
    db.vehicle.count({ where: { companyId } }),
    db.vehicle.count({ where: { companyId, ...listableWhere() } }),
    db.booking.count({ where: { status: "REQUESTED", vehicle: { companyId } } }),
    db.booking.count({ where: { status: { in: ["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED", "IN_PROGRESS"] }, renterCompanyId: companyId } }),
    db.payout.aggregate({ where: { companyId }, _sum: { amountCents: true } }),
    db.booking.findMany({
      where: { OR: [{ vehicle: { companyId } }, { renterCompanyId: companyId }] },
      include: { vehicle: { include: { company: true } }, renterCompany: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);
  const earnedCents = earned._sum.amountCents ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">{me.company.name} · {me.company.city}</p>
          <h1 className="page-title mt-1">Welcome back, {me.name.split(" ")[0]}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/explore" className="btn-secondary">Find a vehicle</Link>
          <Link href="/fleet/new" className="btn-primary">List a vehicle</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Earned from idle days" value={formatCents(earnedCents)} hint="Completed trips, after commission" />
        <Stat label="Live listings" value={`${listed} of ${vehicles}`} hint="Approved and visible to renters" />
        <Stat label="Requests waiting on you" value={incoming} hint={incoming > 0 ? "Answer them in Bookings" : "You're all caught up"} />
        <Stat label="Your rentals" value={outgoing} hint="Requested, approved or on the road" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent activity</h2>
            <Link href="/bookings" className="text-sm text-brand-600 hover:underline">All bookings →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="mt-4">
              <EmptyState>No bookings yet. They&apos;ll show here as you host and rent.</EmptyState>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100">
              {recent.map((b) => {
                const hosting = b.vehicle.companyId === companyId;
                return (
                  <li key={b.id}><Link href={`/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-stone-50">
                    <div>
                      <p className="font-medium text-stone-900">
                        {hosting ? `${b.renterCompany.name} → your ${vehicleTitle(b.vehicle)}` : `You → ${vehicleTitle(b.vehicle)}`}
                      </p>
                      <p className="text-stone-500">
                        {displayDay(b.startDate)} – {displayDay(b.endDate)} · {hosting ? "hosting" : `from ${b.vehicle.company.name}`}
                      </p>
                    </div>
                    <BookingStatusBadge status={b.status} />
                  </Link></li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <div className="card">
            <h2 className="font-semibold">Getting started</h2>
            <ul className="mt-3 space-y-3 text-sm text-stone-600">
              <Tip done={me.company.status === "VERIFIED"} text="Verify your ID for self-drive and listing" href="/account" />
              <Tip done={vehicles > 0} text="List your first vehicle" href="/fleet/new" />
              <Tip done={listed > 0} text="Get a vehicle approved and live" href="/fleet" />
            </ul>
          </div>
          <div className="rounded-xl bg-brand-900 p-5 text-white">
            <p className="text-sm text-brand-100">Need a vehicle for a job?</p>
            <p className="mt-1 font-semibold">Rent a car, with or without a driver.</p>
            <Link href="/explore" className="mt-4 inline-flex rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-brand-900">
              Explore vehicles
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Tip({ done, text, href }: { done: boolean; text: string; href?: string }) {
  const content = (
    <span className="flex items-center gap-2">
      <span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${done ? "bg-brand-600 text-white" : "border border-stone-300"}`}>
        {done ? "✓" : ""}
      </span>
      <span className={done ? "text-stone-400 line-through" : ""}>{text}</span>
    </span>
  );
  return <li>{href && !done ? <Link href={href} className="hover:text-stone-900">{content}</Link> : content}</li>;
}
