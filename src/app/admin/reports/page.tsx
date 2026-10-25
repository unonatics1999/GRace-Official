import Link from "next/link";
import { AdminHeader } from "@/components/admin";
import { EarningsChart } from "@/components/EarningsChart";
import { displayDay, formatDay } from "@/lib/dates";
import { categoryLabel, loadCashPosition, loadPaidBookings } from "@/lib/report-data";
import { buildReport, change, pickGranularity, resolveRange, type Breakdown } from "@/lib/reports";
import { requireAdmin } from "@/lib/session";
import { formatCents } from "@/lib/util";

export const metadata = { title: "Earnings report · GRace Car Rental" };

const PRESETS: [string, string][] = [
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["90d", "Last 90 days"],
  ["mtd", "This month"],
  ["last-month", "Last month"],
  ["ytd", "This year"],
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  await requireAdmin();
  const q = await searchParams;
  const range = resolveRange(q.range, q.from, q.to);

  const [rows, cash] = await Promise.all([loadPaidBookings(range.prevFrom, range.to), loadCashPosition()]);
  const paid = rows.map((r) => r.row);
  const report = buildReport(paid, range.from, range.to, categoryLabel);
  const previous = buildReport(paid, range.prevFrom, range.prevTo, categoryLabel);
  const delta = change(report.earningsCents, previous.earningsCents);
  const query = range.preset === "custom" ? `range=custom&from=${formatDay(range.from)}&to=${formatDay(range.to)}` : `range=${range.preset}`;

  return (
    <>
      <AdminHeader
        title="Earnings"
        description={`${displayDay(range.from)} – ${displayDay(range.to)} · counted on the day the renter paid (Manila time)`}
      >
        <a href={`/admin/reports/export?${query}`} className="btn-secondary">Download CSV</a>
      </AdminHeader>

      {/* Filters, one row */}
      <div className="mb-6 flex flex-wrap items-end gap-2">
        {PRESETS.map(([value, label]) => (
          <Link
            key={value}
            href={`/admin/reports?range=${value}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${range.preset === value ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"}`}
          >
            {label}
          </Link>
        ))}
        <form className="ml-auto flex flex-wrap items-end gap-2" action="/admin/reports">
          <input type="hidden" name="range" value="custom" />
          <label className="text-xs text-stone-500">From<input type="date" name="from" defaultValue={formatDay(range.from)} className="input mt-1 py-1.5" /></label>
          <label className="text-xs text-stone-500">To<input type="date" name="to" defaultValue={formatDay(range.to)} className="input mt-1 py-1.5" /></label>
          <button className="btn-secondary py-2">Apply</button>
        </form>
      </div>

      {/* Hero + tiles */}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_2fr]">
        <section className="card flex flex-col justify-between p-6">
          <p className="text-sm text-stone-500">Your earnings</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight text-stone-900">{formatCents(report.earningsCents)}</p>
          <p className="mt-2 text-sm text-stone-500">
            {delta === null ? (
              "No earnings in the previous period to compare with"
            ) : (
              <>
                <span className={`font-semibold ${delta >= 0 ? "text-[#006300]" : "text-red-700"}`}>
                  {delta >= 0 ? "▲" : "▼"} {Math.abs(delta * 100).toFixed(0)}%
                </span>{" "}
                vs previous {range.days} days ({formatCents(previous.earningsCents)})
              </>
            )}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-stone-100 pt-4 text-sm">
            <div><p className="text-stone-500">Renter service fees</p><p className="font-semibold">{formatCents(report.serviceFeeCents)}</p></div>
            <div><p className="text-stone-500">Owner commission</p><p className="font-semibold">{formatCents(report.commissionCents)}</p></div>
          </div>
        </section>
        <div className="grid grid-cols-2 gap-4">
          <Tile label="Paid bookings" value={report.bookings.toLocaleString()} hint={previous.bookings ? `${previous.bookings} the period before` : undefined} />
          <Tile label="Paid by renters" value={formatCents(report.gmvCents)} hint="Car, driver and service fees" />
          <Tile label="Your take rate" value={report.takeRate === null ? "—" : `${(report.takeRate * 100).toFixed(1)}%`} hint="Earnings ÷ paid by renters" />
          <Tile label="Owners' share" value={formatCents(report.ownerShareCents)} hint={report.refundedCount ? `${report.refundedCount} refunded (${formatCents(report.refundedCents)}) not counted` : "Car and driver fees after commission"} />
        </div>
      </div>

      {/* Over time */}
      <section className="card mt-6 p-6">
        <h2 className="font-semibold">Earnings over time</h2>
        <p className="mb-4 text-sm text-stone-500">
          {{ day: "Daily", week: "Weekly", month: "Monthly" }[pickGranularity(range.from, range.to)]} totals. Hover a column for the split.
        </p>
        {report.earningsCents === 0 ? (
          <p className="rounded-lg bg-stone-50 p-8 text-center text-sm text-stone-500">No paid bookings in this period yet.</p>
        ) : (
          <EarningsChart buckets={report.buckets.map(({ key, label, serviceFeeCents, commissionCents, bookings }) => ({ key, label, serviceFeeCents, commissionCents, bookings }))} />
        )}
      </section>

      {/* Breakdowns */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <BreakdownCard title="By car" rows={report.byVehicle} total={report.earningsCents} />
        <BreakdownCard title="By owner" rows={report.byOwner} total={report.earningsCents} />
        <BreakdownCard title="By category" rows={report.byCategory} total={report.earningsCents} />
        <BreakdownCard title="Self-drive vs with driver" rows={report.byMode} total={report.earningsCents} />
      </div>

      {/* Cash position */}
      <section className="card mt-6 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Money position, all time</h2>
          <Link href="/admin/payouts" className="text-sm text-brand-600 hover:underline">Manage payouts &amp; refunds →</Link>
        </div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <Money label="Collected from renters" value={cash.collectedCents} />
          <Money label="Refunded" value={-cash.refundedCents} />
          <Money label="Paid to owners" value={-cash.paidOutCents} />
          <Money label="Held by GRace" value={cash.heldCents} strong />
          <Money label={`Owed to owners (${cash.owedCount})`} value={cash.owedCents} note={cash.onHoldCount ? `+ ${formatCents(cash.onHoldCents)} on hold` : undefined} />
          <Money label={`Refunds to send (${cash.refundsPendingCount})`} value={cash.refundsPendingCents} />
        </dl>
        <p className="mt-4 text-xs text-stone-500">
          Held = collected − refunded − paid to owners. It still includes what you owe owners and pending refunds, and doesn&apos;t deduct PayMongo&apos;s processing fees. Amounts are as charged; VAT isn&apos;t separated.
        </p>
      </section>
    </>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

function Money({ label, value, strong, note }: { label: string; value: number; strong?: boolean; note?: string }) {
  return (
    <div className={strong ? "rounded-xl bg-brand-50 p-3" : "p-3"}>
      <dt className="text-stone-500">{label}</dt>
      <dd className={`mt-1 tabular-nums ${strong ? "text-lg font-semibold text-brand-700" : "font-semibold text-stone-900"}`}>{formatCents(value)}</dd>
      {note && <p className="text-xs text-stone-500">{note}</p>}
    </div>
  );
}

function BreakdownCard({ title, rows, total }: { title: string; rows: Breakdown[]; total: number }) {
  const top = rows.slice(0, 7);
  const rest = rows.slice(7);
  const shown = rest.length
    ? [...top, { key: "other", label: `Other (${rest.length})`, earningsCents: rest.reduce((n, r) => n + r.earningsCents, 0), gmvCents: rest.reduce((n, r) => n + r.gmvCents, 0), bookings: rest.reduce((n, r) => n + r.bookings, 0) }]
    : top;
  const max = Math.max(1, ...shown.map((r) => r.earningsCents));
  return (
    <section className="card p-6">
      <h2 className="font-semibold">{title}</h2>
      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">Nothing yet.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-stone-500">
            <tr><th className="py-1.5 font-medium"></th><th className="py-1.5 text-right font-medium">Earnings</th><th className="hidden py-1.5 text-right font-medium sm:table-cell">Share</th><th className="py-1.5 text-right font-medium">Bookings</th></tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.key} className="align-middle">
                <td className="py-2 pr-3">
                  <p className="truncate text-stone-800">{r.label}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-stone-100">
                    <div className="h-1.5 rounded-full bg-[#2a78d6]" style={{ width: `${(r.earningsCents / max) * 100}%` }} />
                  </div>
                </td>
                <td className="py-2 text-right font-medium tabular-nums">{formatCents(r.earningsCents)}</td>
                <td className="hidden py-2 text-right tabular-nums text-stone-500 sm:table-cell">{total ? `${((r.earningsCents / total) * 100).toFixed(0)}%` : "—"}</td>
                <td className="py-2 text-right tabular-nums text-stone-600">{r.bookings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
