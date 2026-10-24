import { cancelBooking, respondToBooking } from "@/app/actions/bookings";
import { BookingStatusBadge, EmptyState } from "@/components/ui";
import { displayDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { canManageFleet, formatCents } from "@/lib/util";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const me = await requireCompanyUser();
  const { sent, error } = await searchParams;
  const canRespond = canManageFleet(me.role);

  const [incoming, outgoing] = await Promise.all([
    db.booking.findMany({
      where: { vehicle: { companyId: me.companyId } },
      include: { vehicle: true, renterCompany: true, requestedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    db.booking.findMany({
      where: { renterCompanyId: me.companyId },
      include: { vehicle: { include: { company: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="page-title">Bookings</h1>
      {sent && (
        <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
          Request sent. The host will approve or decline it.
        </p>
      )}
      {error === "clash" && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Couldn&apos;t confirm: another booking for those days was confirmed first. Decline this one.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Requests for your vehicles</h2>
        {incoming.length === 0 ? (
          <EmptyState>No requests yet. Vehicles with downtime set show up in search for verified businesses.</EmptyState>
        ) : (
          <div className="space-y-3">
            {incoming.map((b) => (
              <div key={b.id} className="card flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{b.renterCompany.name}</p>
                    <BookingStatusBadge status={b.status} />
                  </div>
                  <p className="text-sm text-stone-500">
                    {b.vehicle.name} · {displayDay(b.startDate)} – {displayDay(b.endDate)} ({b.days} day
                    {b.days === 1 ? "" : "s"}) · requested by {b.requestedBy.name}
                  </p>
                  {b.note && <p className="text-sm italic text-stone-600">&ldquo;{b.note}&rdquo;</p>}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-right text-sm">
                    <span className="font-semibold">{formatCents(b.subtotalCents - b.hostFeeCents)}</span>
                    <span className="block text-xs text-stone-500">your payout</span>
                  </p>
                  {b.status === "REQUESTED" && canRespond && (
                    <>
                      <form action={respondToBooking.bind(null, b.id, "DECLINED")}>
                        <button className="btn-danger">Decline</button>
                      </form>
                      <form action={respondToBooking.bind(null, b.id, "CONFIRMED")}>
                        <button className="btn-primary">Approve</button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Vehicles you&apos;re renting</h2>
        {outgoing.length === 0 ? (
          <EmptyState>You haven&apos;t requested any vehicles.</EmptyState>
        ) : (
          <div className="space-y-3">
            {outgoing.map((b) => (
              <div key={b.id} className="card flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{b.vehicle.name}</p>
                    <BookingStatusBadge status={b.status} />
                  </div>
                  <p className="text-sm text-stone-500">
                    from {b.vehicle.company.name} · {displayDay(b.startDate)} – {displayDay(b.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-right text-sm">
                    <span className="font-semibold">{formatCents(b.subtotalCents + b.renterFeeCents)}</span>
                    <span className="block text-xs text-stone-500">total</span>
                  </p>
                  {b.status === "REQUESTED" && (
                    <form action={cancelBooking.bind(null, b.id)}>
                      <button className="btn-secondary">Cancel request</button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
