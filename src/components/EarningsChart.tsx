"use client";

import { useState } from "react";

// Stacked columns of earnings per period: service fees (bottom) + commission (top). The two parts
// sum to total earnings, so stacking shows both the total and the split. Palette slots 1 and 2,
// validated against the white card surface.

export type ChartBucket = { key: string; label: string; serviceFeeCents: number; commissionCents: number; bookings: number };

const C = {
  fee: "#2a78d6",
  commission: "#eb6834",
  surface: "#ffffff",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
  ink: "#0b0b0b",
  secondary: "#52514e",
};

const W = 760;
const H = 280;
const M = { top: 24, right: 12, bottom: 32, left: 64 };
const GAP = 2;

const peso = (cents: number, compact = false) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: compact ? 1 : 0,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(cents / 100);

/** A clean axis maximum: 1, 2, 2.5 or 5 times a power of ten. */
function niceMax(value: number): number {
  if (value <= 0) return 100_00;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  for (const m of [1, 2, 2.5, 5, 10]) if (value <= m * exp) return m * exp;
  return 10 * exp;
}

/** Rectangle with only the top corners rounded (square at the baseline). */
function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

export function EarningsChart({ buckets }: { buckets: ChartBucket[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = buckets.map((b) => b.serviceFeeCents + b.commissionCents);
  const max = niceMax(Math.max(0, ...totals));
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const band = plotW / Math.max(1, buckets.length);
  const barW = Math.max(3, Math.min(24, band * 0.6));
  const y = (cents: number) => M.top + plotH - (cents / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.ceil(buckets.length / 8);
  const peak = totals.indexOf(Math.max(...totals));
  const hovered = hover !== null ? buckets[hover] : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-5 text-sm text-stone-600">
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: C.fee }} /> Renter service fees</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: C.commission }} /> Owner commission</span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Earnings over time, service fees and commission stacked">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.axis : C.grid} strokeWidth={1} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={C.muted} style={{ fontVariantNumeric: "tabular-nums" }}>
                {peso(t, true)}
              </text>
            </g>
          ))}

          {buckets.map((b, i) => {
            const cx = M.left + band * i + band / 2;
            const x = cx - barW / 2;
            const feeH = (b.serviceFeeCents / max) * plotH;
            const comH = (b.commissionCents / max) * plotH;
            const base = M.top + plotH;
            const dim = hover !== null && hover !== i;
            return (
              <g key={b.key} opacity={dim ? 0.45 : 1}>
                {b.serviceFeeCents > 0 && (
                  comH > 0 ? (
                    <rect x={x} y={base - feeH} width={barW} height={feeH} fill={C.fee} />
                  ) : (
                    <path d={topRounded(x, base - feeH, barW, feeH, 4)} fill={C.fee} />
                  )
                )}
                {b.commissionCents > 0 && (
                  <path d={topRounded(x, base - feeH - comH, barW, Math.max(0, comH - (feeH > 0 ? GAP : 0)), 4)} fill={C.commission} />
                )}
                {i % labelEvery === 0 && (
                  <text x={cx} y={H - 10} textAnchor="middle" fontSize={11} fill={C.muted}>
                    {b.label.replace("Week of ", "")}
                  </text>
                )}
                {i === peak && totals[i] > 0 && hover === null && (
                  <text x={cx} y={y(totals[i]) - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill={C.secondary}>
                    {peso(totals[i], true)}
                  </text>
                )}
                {/* Hit target: the whole band, taller than the mark. */}
                <rect
                  x={M.left + band * i}
                  y={M.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${b.label}: ${peso(totals[i])}`}
                />
              </g>
            );
          })}
        </svg>

        {hovered && hover !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-56 rounded-xl border border-stone-200 bg-white p-3 text-sm shadow-lg"
            style={{ left: `clamp(0px, calc(${((M.left + band * hover + band / 2) / W) * 100}% - 7rem), calc(100% - 14rem))` }}
          >
            <p className="font-semibold text-stone-900">{hovered.label}</p>
            <dl className="mt-2 space-y-1 tabular-nums">
              <Row color={C.commission} label="Commission" value={peso(hovered.commissionCents)} />
              <Row color={C.fee} label="Service fees" value={peso(hovered.serviceFeeCents)} />
              <div className="flex justify-between border-t border-stone-100 pt-1 font-semibold text-stone-900">
                <dt>Total</dt>
                <dd>{peso(hovered.serviceFeeCents + hovered.commissionCents)}</dd>
              </div>
              <p className="text-xs text-stone-500">{hovered.bookings} paid booking{hovered.bookings === 1 ? "" : "s"}</p>
            </dl>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-stone-500 hover:text-stone-800">Show as table</summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-stone-200">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr><th className="px-3 py-2">Period</th><th className="px-3 py-2 text-right">Service fees</th><th className="px-3 py-2 text-right">Commission</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Bookings</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {buckets.map((b) => (
                <tr key={b.key}>
                  <td className="px-3 py-1.5">{b.label}</td>
                  <td className="px-3 py-1.5 text-right">{peso(b.serviceFeeCents)}</td>
                  <td className="px-3 py-1.5 text-right">{peso(b.commissionCents)}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{peso(b.serviceFeeCents + b.commissionCents)}</td>
                  <td className="px-3 py-1.5 text-right">{b.bookings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-stone-600">
      <dt className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />{label}</dt>
      <dd className="text-stone-900">{value}</dd>
    </div>
  );
}
