import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelBooking, payForBooking, reportIssue, respondToBooking } from "@/app/actions/bookings";
import { confirmInspection } from "@/app/actions/inspections";
import { submitReview } from "@/app/actions/reviews";
import { ActionForm } from "@/components/ActionForm";
import { InspectionForm } from "@/components/InspectionForm";
import { StarInput } from "@/components/StarInput";
import { BookingStatusBadge } from "@/components/ui";
import { VehicleImage } from "@/components/VehicleImage";
import { formatBps } from "@/lib/commission";
import { FUEL_LEVELS, PHOTO_ANGLES, type PhotoAngle } from "@/lib/constants";
import { displayDateTime, displayDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { paymentsSimulated } from "@/lib/env";
import { canApproveOrDecline, canPay, canRenterCancel, canStartPickup, canStartReturn, compareInspections } from "@/lib/lifecycle";
import { vehicleTitle } from "@/lib/listings";
import { expireOverdueBookings } from "@/lib/payments";
import { requireCompanyUser } from "@/lib/session";
import { canManageFleet, formatCents } from "@/lib/util";

const STEPS = [
  { key: "REQUESTED", label: "Requested" },
  { key: "AWAITING_PAYMENT", label: "Approved" },
  { key: "CONFIRMED", label: "Paid" },
  { key: "IN_PROGRESS", label: "Picked up" },
  { key: "COMPLETED", label: "Returned" },
];

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; paid?: string; error?: string }>;
}) {
  const { id } = await params;
  const flags = await searchParams;
  const me = await requireCompanyUser();
  await expireOverdueBookings();

  const booking = await db.booking.findFirst({
    where: { id, OR: [{ renterCompanyId: me.companyId }, { vehicle: { companyId: me.companyId } }] },
    include: {
      vehicle: { include: { company: true, photos: { orderBy: { position: "asc" }, take: 1 } } },
      renterCompany: true,
      requestedBy: true,
      driver: { include: { user: true } },
      payments: { orderBy: { createdAt: "desc" } },
      inspections: { include: { photos: true, createdBy: true, confirmedBy: true }, orderBy: { createdAt: "asc" } },
      payout: true,
      review: true,
    },
  });
  if (!booking) notFound();

  const isHost = booking.vehicle.companyId === me.companyId;
  const party = isHost ? "host" : "renter";
  const canManage = canManageFleet(me.role);
  const other = isHost ? booking.renterCompany : booking.vehicle.company;
  const pickup = booking.inspections.find((i) => i.phase === "PICKUP");
  const ret = booking.inspections.find((i) => i.phase === "RETURN");
  const base = booking.vehicleCents + booking.driverCents;
  const renterTotal = base + booking.renterFeeCents;
  const hostPayout = base - booking.hostFeeCents;
  const stepIndex = STEPS.findIndex((s) => s.key === booking.status);
  const sideExit = stepIndex === -1;
  const paidPayment = booking.payments.find((p) => p.status === "PAID");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/bookings" className="text-sm text-stone-500 hover:text-stone-900">← Bookings</Link>

      {flags.sent && <Note tone="green">Request sent. {booking.vehicle.company.name} will approve or decline it. You&apos;ll pay after approval.</Note>}
      {flags.paid && booking.status === "CONFIRMED" && <Note tone="green">Payment received. Your booking is confirmed.</Note>}
      {flags.paid && booking.status === "AWAITING_PAYMENT" && <Note tone="amber">We&apos;re waiting for PayMongo to confirm your payment. Refresh in a minute.</Note>}
      {flags.error === "clash" && <Note tone="red">Those dates were just taken by another approved booking, so this one can&apos;t be approved. Decline it.</Note>}
      {flags.error === "busy" && <Note tone="amber">Lots happening on this car right now. Please try that again.</Note>}
      {flags.error === "payment" && <Note tone="red">This booking can&apos;t be paid now. The payment window may have closed.</Note>}

      <div className="flex flex-wrap items-start gap-5">
        <VehicleImage vehicle={booking.vehicle} className="aspect-[4/3] w-40 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title">{vehicleTitle(booking.vehicle)}</h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-stone-600">
            {displayDay(booking.startDate)} – {displayDay(booking.endDate)} · {booking.days} day{booking.days === 1 ? "" : "s"} ·{" "}
            {booking.mode === "WITH_DRIVER" ? `with driver${booking.driver ? ` (${booking.driver.user.name})` : ""}` : "self-drive"}
          </p>
          <p className="text-sm text-stone-500">
            {isHost ? `Renter: ${booking.renterCompany.name} (${booking.requestedBy.name})` : `Owner: ${booking.vehicle.company.name}`} · plate {booking.vehicle.plateNumber}
          </p>
          {booking.note && <p className="mt-2 text-sm italic text-stone-600">&ldquo;{booking.note}&rdquo;</p>}
        </div>
      </div>

      {!sideExit && (
        <ol className="grid grid-cols-5 gap-1">
          {STEPS.map((s, i) => (
            <li key={s.key} className="text-center">
              <div className={`h-1.5 rounded-full ${i <= stepIndex ? "bg-brand-600" : "bg-stone-200"}`} />
              <p className={`mt-2 text-xs ${i <= stepIndex ? "font-medium text-brand-700" : "text-stone-400"}`}>{s.label}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Next step for this party */}
          {booking.status === "REQUESTED" && isHost && canManage && canApproveOrDecline(booking) && (
            <Card title="New request">
              <p className="text-sm text-stone-600">
                Approve to hold these dates. {booking.renterCompany.name} then has until the payment deadline to pay.
              </p>
              <div className="mt-4 flex gap-2">
                <form action={respondToBooking.bind(null, booking.id, "DECLINE")}><button className="btn-danger">Decline</button></form>
                <form action={respondToBooking.bind(null, booking.id, "APPROVE")}><button className="btn-primary">Approve</button></form>
              </div>
            </Card>
          )}
          {booking.status === "REQUESTED" && !isHost && (
            <Card title="Waiting for the owner">
              <p className="text-sm text-stone-600">{booking.vehicle.company.name} usually replies within a few hours. You&apos;ll pay once they approve.</p>
            </Card>
          )}

          {booking.status === "AWAITING_PAYMENT" && (
            <Card title={isHost ? "Waiting for payment" : "Pay to confirm"}>
              <p className="text-sm text-stone-600">
                {isHost ? "The dates are held for the renter until " : "Pay by "}
                <span className="font-medium text-stone-900">{booking.paymentDueAt ? displayDateTime(booking.paymentDueAt) : "—"}</span>
                {isHost ? ". If they don't pay by then, the dates are released." : ", or the dates are released."}
              </p>
              {!isHost && canPay(booking) && (
                <form action={payForBooking.bind(null, booking.id)} className="mt-4">
                  <button className="btn-primary px-6 py-3">Pay {formatCents(renterTotal)}</button>
                  <span className="ml-3 text-xs text-stone-500">
                    {paymentsSimulated() ? "Development mode: payment is simulated." : "GCash, Maya, cards or QR Ph via PayMongo."}
                  </span>
                </form>
              )}
            </Card>
          )}

          {(booking.status === "CONFIRMED" || booking.status === "IN_PROGRESS" || booking.status === "COMPLETED") && (
            <Card title="Handoff checklist">
              <p className="text-sm text-stone-600">
                At pick-up and return, one side photographs the vehicle and records the odometer and fuel. The other side confirms it. This record settles any damage question.
              </p>
              <div className="mt-5 space-y-6">
                <InspectionBlock
                  title="Pick-up"
                  inspection={pickup}
                  party={party}
                  hostCompanyId={booking.vehicle.companyId}
                  canFill={!pickup && canStartPickup(booking)}
                  waitingText={!pickup && !canStartPickup(booking) ? `Opens the day before pick-up (${displayDay(booking.startDate)}).` : undefined}
                  form={<InspectionForm bookingId={booking.id} phase="PICKUP" />}
                />
                {(booking.status === "IN_PROGRESS" || booking.status === "COMPLETED") && (
                  <InspectionBlock
                    title="Return"
                    inspection={ret}
                    party={party}
                    hostCompanyId={booking.vehicle.companyId}
                    canFill={!ret && canStartReturn(booking)}
                    form={<InspectionForm bookingId={booking.id} phase="RETURN" minOdometer={pickup?.odometerKm} />}
                  />
                )}
                {pickup && ret && (
                  <TripSummary {...compareInspections(pickup, ret)} />
                )}
              </div>
            </Card>
          )}

          {booking.status === "COMPLETED" && !isHost && (
            <Card title={booking.review ? "Your rating" : "Rate your trip"}>
              {booking.review ? (
                <p className="text-sm text-stone-600">
                  Vehicle {"★".repeat(booking.review.vehicleRating)}
                  {booking.review.driverRating ? ` · Driver ${"★".repeat(booking.review.driverRating)}` : ""}
                  {booking.review.comment && <span className="block italic">&ldquo;{booking.review.comment}&rdquo;</span>}
                </p>
              ) : (
                <ActionForm action={submitReview.bind(null, booking.id)} submitLabel="Submit rating" className="space-y-4">
                  <div className="flex flex-wrap gap-8">
                    <StarInput name="vehicleRating" label="Vehicle" />
                    {booking.driverId && <StarInput name="driverRating" label={`Driver${booking.driver ? ` (${booking.driver.user.name})` : ""}`} />}
                  </div>
                  <textarea name="comment" rows={2} maxLength={1000} className="input" placeholder="What went well? Anything to improve?" />
                </ActionForm>
              )}
            </Card>
          )}

          {["CANCELLED", "DECLINED", "EXPIRED"].includes(booking.status) && (
            <Card title={booking.status === "EXPIRED" ? "Payment window closed" : booking.status === "DECLINED" ? "Declined by the owner" : "Cancelled"}>
              <p className="text-sm text-stone-600">
                {paidPayment?.refundNeeded
                  ? "This booking was paid, so GRace will refund it to the original payment method within 5–10 business days."
                  : "No payment was taken for this booking."}
                {!isHost && <> <Link href="/explore" className="font-medium text-brand-600 underline">Find another vehicle</Link>.</>}
              </p>
            </Card>
          )}

          {!["REQUESTED", "DECLINED", "EXPIRED"].includes(booking.status) && (
            <Card title="Something wrong?">
              {booking.issue && (
                <div className="mb-4 whitespace-pre-line rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  {booking.issue}
                  <p className="mt-2 text-xs">{booking.issueResolvedAt ? `Resolved ${displayDateTime(booking.issueResolvedAt)}` : "Open: GRace support is on it."}</p>
                </div>
              )}
              <ActionForm action={reportIssue.bind(null, booking.id)} submitLabel="Report to GRace" className="space-y-3">
                <textarea name="issue" rows={2} maxLength={1000} required className="input" placeholder="Damage, late return, no-show, a dispute about fuel…" />
              </ActionForm>
            </Card>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card title={isHost ? "Your earnings" : "Price"}>
            <dl className="space-y-2 text-sm">
              <Row label="Car" value={formatCents(booking.vehicleCents)} />
              {booking.driverCents > 0 && <Row label="Driver" value={formatCents(booking.driverCents)} />}
              {isHost ? (
                <>
                  <Row label={`GRace commission (${formatBps(booking.hostCommissionBps)})`} value={`−${formatCents(booking.hostFeeCents)}`} />
                  <Total label="Your payout" value={formatCents(hostPayout)} />
                  <p className="text-xs text-stone-500">
                    {booking.payout
                      ? booking.payout.status === "PAID"
                        ? `Paid ${booking.payout.paidAt ? displayDay(booking.payout.paidAt) : ""}${booking.payout.reference ? ` · ref ${booking.payout.reference}` : ""}`
                        : booking.payout.status === "ON_HOLD"
                          ? "On hold until the reported issue is resolved."
                          : "Scheduled in the next weekly payout."
                      : "Paid out weekly after the return is confirmed."}
                  </p>
                </>
              ) : (
                <>
                  <Row label={`Service fee (${formatBps(booking.renterFeeBps)})`} value={formatCents(booking.renterFeeCents)} />
                  <Total label="Total" value={formatCents(renterTotal)} />
                  {paidPayment && <p className="text-xs text-stone-500">Paid {paidPayment.paidAt ? displayDateTime(paidPayment.paidAt) : ""}</p>}
                </>
              )}
            </dl>
          </Card>

          <Card title={isHost ? "Renter" : "Owner"}>
            <p className="text-sm font-medium text-stone-900">{other.name}</p>
            {["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(booking.status) ? (
              <p className="text-sm text-stone-600">{other.phone || "No phone on file"}</p>
            ) : (
              <p className="text-xs text-stone-500">Contact details appear once the booking is paid.</p>
            )}
          </Card>

          {!isHost && canRenterCancel(booking) && (
            <form action={cancelBooking.bind(null, booking.id)}>
              <button className="btn-secondary w-full">
                {booking.status === "CONFIRMED" ? "Cancel and request a refund" : "Cancel request"}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

type InspectionWithPhotos = {
  id: string;
  odometerKm: number;
  fuelQuarters: number;
  notes: string;
  createdAt: Date;
  confirmedAt: Date | null;
  createdBy: { name: string; companyId: string | null };
  confirmedBy: { name: string } | null;
  photos: { id: string; angle: string }[];
};

function InspectionBlock({
  title,
  inspection,
  party,
  hostCompanyId,
  canFill,
  waitingText,
  form,
}: {
  title: string;
  inspection?: InspectionWithPhotos;
  party: "host" | "renter";
  hostCompanyId: string;
  canFill: boolean;
  waitingText?: string;
  form: React.ReactNode;
}) {
  if (!inspection) {
    return (
      <div className="rounded-xl border border-stone-200 p-4">
        <p className="font-medium">{title}</p>
        {canFill ? <div className="mt-4">{form}</div> : <p className="mt-1 text-sm text-stone-500">{waitingText ?? "Not yet."}</p>}
      </div>
    );
  }
  const createdByParty = inspection.createdBy.companyId === hostCompanyId ? "host" : "renter";
  const iCanConfirm = !inspection.confirmedAt && createdByParty !== party;
  return (
    <div className="rounded-xl border border-stone-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{title}</p>
        <span className={`badge ${inspection.confirmedAt ? "bg-brand-100 text-brand-700" : "bg-amber-100 text-amber-800"}`}>
          {inspection.confirmedAt ? `Confirmed by ${inspection.confirmedBy?.name}` : "Waiting for the other side to confirm"}
        </span>
      </div>
      <p className="mt-1 text-sm text-stone-600">
        {inspection.odometerKm.toLocaleString()} km · fuel {FUEL_LEVELS[inspection.fuelQuarters]} · by {inspection.createdBy.name}, {displayDateTime(inspection.createdAt)}
      </p>
      {inspection.notes && <p className="mt-1 text-sm italic text-stone-600">&ldquo;{inspection.notes}&rdquo;</p>}
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {inspection.photos.map((p) => (
          <a key={p.id} href={`/api/files/inspection-photo/${p.id}`} target="_blank" className="group relative block aspect-square overflow-hidden rounded-lg bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- served by our own auth-checked route */}
            <img src={`/api/files/inspection-photo/${p.id}`} alt={PHOTO_ANGLES[p.angle as PhotoAngle]} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[10px] text-white">{PHOTO_ANGLES[p.angle as PhotoAngle]}</span>
          </a>
        ))}
      </div>
      {iCanConfirm && (
        <form action={confirmInspection.bind(null, inspection.id)} className="mt-4 flex flex-wrap items-center gap-3">
          <button className="btn-primary">Confirm: this matches the vehicle</button>
          <span className="text-xs text-stone-500">Doesn&apos;t match? Don&apos;t confirm. Report it below instead.</span>
        </form>
      )}
    </div>
  );
}

function TripSummary({ distanceKm, fuelChangeQuarters }: { distanceKm: number; fuelChangeQuarters: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-4 text-sm">
      <div>
        <p className="text-stone-500">Distance driven</p>
        <p className="text-lg font-semibold">{distanceKm.toLocaleString()} km</p>
      </div>
      <div>
        <p className="text-stone-500">Fuel</p>
        <p className={`text-lg font-semibold ${fuelChangeQuarters < 0 ? "text-amber-700" : ""}`}>
          {fuelChangeQuarters === 0 ? "Same level" : `${fuelChangeQuarters > 0 ? "+" : "−"}${Math.abs(fuelChangeQuarters)}/4 tank`}
        </p>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-stone-600">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Note({ tone, children }: { tone: "green" | "amber" | "red"; children: React.ReactNode }) {
  const cls = { green: "bg-brand-50 text-brand-700", amber: "bg-amber-50 text-amber-900", red: "bg-red-50 text-red-700" }[tone];
  return <p className={`rounded-xl p-4 text-sm ${cls}`}>{children}</p>;
}
