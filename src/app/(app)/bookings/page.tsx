import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { BookingStatusBadge, EmptyState } from "@/components/ui";
import { VehicleImage } from "@/components/VehicleImage";
import { displayDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { vehicleTitle } from "@/lib/listings";
import { expireOverdueBookings } from "@/lib/payments";
import { requireCompanyUser } from "@/lib/session";
import { formatCents } from "@/lib/util";

export const metadata = { title: "Bookings · GRace Car Rental" };

const ACTIVE = ["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED", "IN_PROGRESS"];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const me = await requireCompanyUser();
  const { view } = await searchParams;
  const owner = me.company.accountType === "OWNER";
  // Owners land on the bookings for their cars; renters only see their trips.
  const hosting = owner && view !== "trips";
  await expireOverdueBookings();

  const bookings = await db.booking.findMany({
    where: hosting ? { vehicle: { companyId: me.companyId } } : { renterCompanyId: me.companyId },
    include: { vehicle: { include: { company: true, photos: { orderBy: { position: "asc" }, take: 1 } } }, renterCompany: true },
    orderBy: { createdAt: "desc" },
  });
  const active = bookings.filter((b) => ACTIVE.includes(b.status));
  const past = bookings.filter((b) => !ACTIVE.includes(b.status));
  const needsYou = active.filter((b) => (hosting ? b.status === "REQUESTED" : b.status === "AWAITING_PAYMENT")).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">{owner ? "Bookings" : "My trips"}</h1>
        {owner && (
          <div className="flex gap-1 rounded-xl bg-stone-200/60 p-1 text-sm">
            <Tab href="/bookings" active={hosting}>For my cars</Tab>
            <Tab href="/bookings?view=trips" active={!hosting}>Cars I rented</Tab>
          </div>
        )}
      </div>

      {needsYou > 0 && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          {needsYou} booking{needsYou === 1 ? "" : "s"} {hosting ? "waiting for your approval" : "waiting for your payment"}.
        </p>
      )}

      <List title="Active" items={active} hosting={hosting} empty={hosting ? "No active bookings on your vehicles." : "No active trips."} />
      {past.length > 0 && <List title="Past" items={past} hosting={hosting} />}
    </div>
  );
}

type Item = Prisma.BookingGetPayload<{ include: { vehicle: { include: { company: true; photos: true } }; renterCompany: true } }>;

function List({ title, items, hosting, empty }: { title: string; items: Item[]; hosting: boolean; empty?: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h2>
      {items.length === 0 ? (
        <EmptyState>
          {empty}
          {!hosting && <div className="mt-3"><Link href="/explore" className="btn-primary">Find a vehicle</Link></div>}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {items.map((b) => {
            const base = b.vehicleCents + b.driverCents;
            return (
              <Link key={b.id} href={`/bookings/${b.id}`} className="card flex items-center gap-4 p-4 transition hover:shadow-md">
                <VehicleImage vehicle={b.vehicle} className="aspect-[4/3] w-24 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-stone-900">{vehicleTitle(b.vehicle)}</p>
                    <BookingStatusBadge status={b.status} />
                  </div>
                  <p className="text-sm text-stone-500">
                    {displayDay(b.startDate)} – {displayDay(b.endDate)} · {b.mode === "WITH_DRIVER" ? "with driver" : "self-drive"} ·{" "}
                    {hosting ? b.renterCompany.name : b.vehicle.company.name}
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm">
                  <span className="font-semibold">{formatCents(hosting ? base - b.hostFeeCents : base + b.renterFeeCents)}</span>
                  <span className="block text-xs text-stone-500">{hosting ? "your payout" : "total"}</span>
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`rounded-lg px-4 py-1.5 ${active ? "bg-white font-medium shadow-sm" : "text-stone-600 hover:text-stone-900"}`}>
      {children}
    </Link>
  );
}
