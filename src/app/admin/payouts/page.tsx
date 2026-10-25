import { markPayoutPaid, markRefunded } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { ActionButton, AdminHeader, Table, Td } from "@/components/admin";
import { PAYOUT_STATUS } from "@/lib/constants";
import { displayDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { vehicleTitle } from "@/lib/listings";
import { requireAdmin } from "@/lib/session";
import { formatCents } from "@/lib/util";

export default async function PayoutsPage() {
  await requireAdmin();
  const [payouts, refunds] = await Promise.all([
    db.payout.findMany({
      include: { company: true, booking: { include: { vehicle: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 200,
    }),
    db.payment.findMany({
      where: { refundNeeded: true },
      include: { booking: { include: { renterCompany: true, vehicle: true } } },
      orderBy: { paidAt: "desc" },
    }),
  ]);
  const owed = payouts.filter((p) => p.status === "PENDING").reduce((n, p) => n + p.amountCents, 0);

  return (
    <>
      <AdminHeader
        title="Payouts & refunds"
        description={`Renters pay through PayMongo. Hosts are paid by bank transfer or GCash: send the money, then record the reference here. ${formatCents(owed)} currently owed.`}
      />

      <h2 className="mb-3 font-semibold">Host payouts</h2>
      <Table head={["Host", "Booking", "Pay to", "Amount", "Status", ""]} empty={payouts.length === 0}>
        {payouts.map((p) => (
          <tr key={p.id} className="align-top">
            <Td><p className="font-medium">{p.company.name}</p><p className="text-xs text-stone-500">{p.company.phone}</p></Td>
            <Td>
              <p>{vehicleTitle(p.booking.vehicle)}</p>
              <p className="text-xs text-stone-500">{displayDay(p.booking.startDate)} – {displayDay(p.booking.endDate)}</p>
            </Td>
            <Td className="text-stone-600">{p.company.payoutDetails || <span className="text-red-600">No payout details</span>}</Td>
            <Td className="font-semibold">{formatCents(p.amountCents)}</Td>
            <Td>
              <span className={`badge ${p.status === "PAID" ? "bg-brand-100 text-brand-700" : p.status === "ON_HOLD" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                {PAYOUT_STATUS[p.status as keyof typeof PAYOUT_STATUS]}
              </span>
              {p.reference && <p className="mt-1 text-xs text-stone-500">ref {p.reference}</p>}
            </Td>
            <Td>
              {p.status === "PENDING" && (
                <ActionForm action={markPayoutPaid.bind(null, p.id)} submitLabel="Mark paid" className="flex items-center gap-2">
                  <input name="reference" placeholder="Reference no." className="input w-36 py-1 text-xs" />
                </ActionForm>
              )}
              {p.status === "ON_HOLD" && <span className="text-xs text-stone-500">Resolve the booking&apos;s issue first</span>}
            </Td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-3 mt-10 font-semibold">Refunds to process</h2>
      <p className="mb-3 text-sm text-stone-500">Issue these from the PayMongo dashboard (Payments → Refund), then mark them done.</p>
      <Table head={["Renter", "Booking", "Amount", "Paid", "Status", ""]} empty={refunds.length === 0}>
        {refunds.map((r) => (
          <tr key={r.id}>
            <Td className="font-medium">{r.booking.renterCompany.name}</Td>
            <Td>{vehicleTitle(r.booking.vehicle)} · {r.booking.status.toLowerCase()}</Td>
            <Td className="font-semibold">{formatCents(r.amountCents)}</Td>
            <Td className="text-stone-600">{r.paidAt ? displayDay(r.paidAt) : "—"} · {r.provider.toLowerCase()}</Td>
            <Td>{r.refundedAt ? <span className="badge bg-brand-100 text-brand-700">Refunded {displayDay(r.refundedAt)}</span> : <span className="badge bg-red-100 text-red-700">To refund</span>}</Td>
            <Td>{!r.refundedAt && <ActionButton action={markRefunded.bind(null, r.id)} label="Mark refunded" />}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
