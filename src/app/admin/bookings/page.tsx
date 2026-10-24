import { adminCancelBooking } from "@/app/actions/admin";
import { ActionButton, AdminHeader, FilterTabs, Table, Td } from "@/components/admin";
import { BookingStatusBadge } from "@/components/ui";
import { BOOKING_STATUS } from "@/lib/constants";
import { displayDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatCents } from "@/lib/util";

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = status && status in BOOKING_STATUS ? status : undefined;

  const [counts, bookings] = await Promise.all([
    db.booking.groupBy({ by: ["status"], _count: true }),
    db.booking.findMany({
      where: filter ? { status: filter } : {},
      include: { vehicle: { include: { company: true } }, renterCompany: true, requestedBy: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <AdminHeader title="Bookings" description="Every request on the marketplace. Cancel an open booking when support needs to step in." />
      <FilterTabs
        base="/admin/bookings"
        current={filter}
        options={[
          { label: "All", count: counts.reduce((n, c) => n + c._count, 0) },
          ...Object.entries(BOOKING_STATUS).map(([value, label]) => ({ value, label, count: count(value) })),
        ]}
      />
      <Table head={["Renter", "Vehicle / host", "Dates", "Subtotal", "Fees", "Status", ""]} empty={bookings.length === 0}>
        {bookings.map((b) => (
          <tr key={b.id} className="hover:bg-stone-50/60">
            <Td>
              <p className="font-medium text-stone-900">{b.renterCompany.name}</p>
              <p className="text-xs text-stone-500">{b.requestedBy.email}</p>
            </Td>
            <Td>
              <p>{b.vehicle.name}</p>
              <p className="text-xs text-stone-500">{b.vehicle.company.name}</p>
            </Td>
            <Td className="whitespace-nowrap text-stone-600">
              {displayDay(b.startDate)} – {displayDay(b.endDate)}
              <span className="block text-xs text-stone-400">{b.days} day{b.days === 1 ? "" : "s"}</span>
            </Td>
            <Td>{formatCents(b.subtotalCents)}</Td>
            <Td className="text-stone-600">{formatCents(b.renterFeeCents + b.hostFeeCents)}</Td>
            <Td><BookingStatusBadge status={b.status} /></Td>
            <Td>
              <div className="flex justify-end">
                {(b.status === "REQUESTED" || b.status === "CONFIRMED") && (
                  <ActionButton action={adminCancelBooking.bind(null, b.id)} label="Cancel" tone="danger" />
                )}
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
