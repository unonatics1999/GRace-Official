import Link from "next/link";
import { adminCancelBooking, resolveIssue } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { ActionButton, AdminHeader, FilterTabs, Table, Td } from "@/components/admin";
import { BookingStatusBadge } from "@/components/ui";
import { BOOKING_STATUS } from "@/lib/constants";
import { displayDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { vehicleTitle } from "@/lib/listings";
import { requireAdmin } from "@/lib/session";
import { formatCents } from "@/lib/util";

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const issues = status === "ISSUES";
  const filter = status && status in BOOKING_STATUS ? status : undefined;

  const [counts, openIssues, bookings] = await Promise.all([
    db.booking.groupBy({ by: ["status"], _count: true }),
    db.booking.count({ where: { issueOpenedAt: { not: null }, issueResolvedAt: null } }),
    db.booking.findMany({
      where: issues ? { issueOpenedAt: { not: null }, issueResolvedAt: null } : filter ? { status: filter } : {},
      include: { vehicle: { include: { company: true } }, renterCompany: true, requestedBy: true, driver: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <AdminHeader title="Bookings" description="Every booking on the marketplace. Resolve reported issues to release held payouts." />
      <FilterTabs
        base="/admin/bookings"
        current={issues ? "ISSUES" : filter}
        options={[
          { label: "All", count: counts.reduce((n, c) => n + c._count, 0) },
          { value: "ISSUES", label: "Open issues", count: openIssues },
          ...Object.entries(BOOKING_STATUS).map(([value, label]) => ({ value, label, count: count(value) })),
        ]}
      />

      {issues ? (
        <div className="space-y-4">
          {bookings.length === 0 && <p className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">No open issues.</p>}
          {bookings.map((b) => (
            <article key={b.id} className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {b.renterCompany.name} → {vehicleTitle(b.vehicle)} ({b.vehicle.company.name})
                </p>
                <BookingStatusBadge status={b.status} />
              </div>
              <p className="text-sm text-stone-500">
                {displayDay(b.startDate)} – {displayDay(b.endDate)} · renter {b.renterCompany.phone || "no phone"} · owner {b.vehicle.company.phone || "no phone"}
              </p>
              <p className="whitespace-pre-line rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{b.issue}</p>
              <ActionForm action={resolveIssue.bind(null, b.id)} submitLabel="Resolve and release payout" className="flex flex-wrap items-end gap-2">
                <input name="resolution" className="input flex-1" placeholder="How it was resolved, e.g. renter paid ₱2,000 for bumper repair" />
              </ActionForm>
            </article>
          ))}
        </div>
      ) : (
        <Table head={["Renter", "Vehicle / owner", "Dates", "Mode", "Renter paid", "Our cut", "Status", ""]} empty={bookings.length === 0}>
          {bookings.map((b) => (
            <tr key={b.id} className="hover:bg-stone-50/60">
              <Td>
                <p className="font-medium text-stone-900">{b.renterCompany.name}</p>
                <p className="text-xs text-stone-500">{b.requestedBy.email}</p>
              </Td>
              <Td>
                <p>{vehicleTitle(b.vehicle)}</p>
                <p className="text-xs text-stone-500">{b.vehicle.company.name}</p>
              </Td>
              <Td className="whitespace-nowrap text-stone-600">
                {displayDay(b.startDate)} – {displayDay(b.endDate)}
                <span className="block text-xs text-stone-400">{b.days} day{b.days === 1 ? "" : "s"}</span>
              </Td>
              <Td className="text-stone-600">{b.mode === "WITH_DRIVER" ? `Driver: ${b.driver?.user.name ?? "—"}` : "Self-drive"}</Td>
              <Td>{formatCents(b.vehicleCents + b.driverCents + b.renterFeeCents)}</Td>
              <Td className="font-medium text-brand-700">{formatCents(b.renterFeeCents + b.hostFeeCents)}</Td>
              <Td>
                <BookingStatusBadge status={b.status} />
                {b.issueOpenedAt && !b.issueResolvedAt && (
                  <Link href="/admin/bookings?status=ISSUES" className="mt-1 block text-xs text-red-600">Issue open</Link>
                )}
              </Td>
              <Td>
                <div className="flex justify-end">
                  {["REQUESTED", "AWAITING_PAYMENT", "CONFIRMED"].includes(b.status) && (
                    <ActionButton action={adminCancelBooking.bind(null, b.id)} label="Cancel" tone="danger" />
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
