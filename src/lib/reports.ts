// Earnings reporting. Pure functions over paid bookings, so the numbers are easy to test.
//
// Definitions (cash basis, Manila calendar):
//   - A booking counts on the day its payment was received (paidAt).
//   - Paid by renters (GMV) = what renters paid: car + driver + service fee.
//   - Your earnings = renter service fee + owner commission.
//   - Refunded or refund-pending payments are excluded from earnings and shown separately.

import { addDays, formatDay, manilaDay, parseDay } from "./dates";

export type PaidBooking = {
  id: string;
  paidAt: Date;
  amountCents: number;
  refundNeeded: boolean;
  renterFeeCents: number;
  hostFeeCents: number;
  vehicleCents: number;
  driverCents: number;
  mode: string;
  vehicle: { id: string; label: string; type: string; ownerId: string; ownerName: string };
};

export type Granularity = "day" | "week" | "month";

export type Bucket = { key: string; label: string; start: Date; serviceFeeCents: number; commissionCents: number; bookings: number };

export type Breakdown = { key: string; label: string; earningsCents: number; gmvCents: number; bookings: number };

export type Report = {
  earningsCents: number;
  serviceFeeCents: number;
  commissionCents: number;
  gmvCents: number;
  ownerShareCents: number;
  bookings: number;
  takeRate: number | null;
  refundedCents: number;
  refundedCount: number;
  buckets: Bucket[];
  byVehicle: Breakdown[];
  byOwner: Breakdown[];
  byCategory: Breakdown[];
  byMode: Breakdown[];
};

export function pickGranularity(from: Date, to: Date): Granularity {
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  return days <= 62 ? "day" : days <= 370 ? "week" : "month";
}

/** Start of the bucket a Manila calendar day falls in. Weeks start on Monday. */
export function bucketStart(day: Date, granularity: Granularity): Date {
  if (granularity === "day") return day;
  if (granularity === "week") return addDays(day, -((day.getUTCDay() + 6) % 7));
  return parseDay(`${formatDay(day).slice(0, 7)}-01`)!;
}

function nextBucket(start: Date, granularity: Granularity): Date {
  if (granularity === "day") return addDays(start, 1);
  if (granularity === "week") return addDays(start, 7);
  const d = new Date(start);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

function bucketLabel(start: Date, granularity: Granularity): string {
  const opts: Intl.DateTimeFormatOptions =
    granularity === "month" ? { month: "short", year: "numeric", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" };
  const label = start.toLocaleDateString("en-PH", opts);
  return granularity === "week" ? `Week of ${label}` : label;
}

function group(rows: PaidBooking[], keyOf: (r: PaidBooking) => [string, string]): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const r of rows) {
    const [key, label] = keyOf(r);
    const g = map.get(key) ?? { key, label, earningsCents: 0, gmvCents: 0, bookings: 0 };
    g.earningsCents += r.renterFeeCents + r.hostFeeCents;
    g.gmvCents += r.amountCents;
    g.bookings += 1;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.earningsCents - a.earningsCents);
}

const MODE_LABEL: Record<string, string> = { SELF_DRIVE: "Self-drive", WITH_DRIVER: "With driver" };

/** Builds the report for Manila days `from`..`to` inclusive. */
export function buildReport(payments: PaidBooking[], from: Date, to: Date, categoryLabel: (type: string) => string): Report {
  const inRange = payments.filter((p) => {
    const day = manilaDay(p.paidAt);
    return day >= from && day <= to;
  });
  const refunded = inRange.filter((p) => p.refundNeeded);
  const counted = inRange.filter((p) => !p.refundNeeded);

  const granularity = pickGranularity(from, to);
  const buckets: Bucket[] = [];
  for (let s = bucketStart(from, granularity); s <= to; s = nextBucket(s, granularity)) {
    buckets.push({ key: formatDay(s), label: bucketLabel(s, granularity), start: s, serviceFeeCents: 0, commissionCents: 0, bookings: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const p of counted) {
    const b = byKey.get(formatDay(bucketStart(manilaDay(p.paidAt), granularity)));
    if (!b) continue;
    b.serviceFeeCents += p.renterFeeCents;
    b.commissionCents += p.hostFeeCents;
    b.bookings += 1;
  }

  const serviceFeeCents = counted.reduce((n, p) => n + p.renterFeeCents, 0);
  const commissionCents = counted.reduce((n, p) => n + p.hostFeeCents, 0);
  const gmvCents = counted.reduce((n, p) => n + p.amountCents, 0);
  const earningsCents = serviceFeeCents + commissionCents;

  return {
    earningsCents,
    serviceFeeCents,
    commissionCents,
    gmvCents,
    ownerShareCents: counted.reduce((n, p) => n + p.vehicleCents + p.driverCents - p.hostFeeCents, 0),
    bookings: counted.length,
    takeRate: gmvCents > 0 ? earningsCents / gmvCents : null,
    refundedCents: refunded.reduce((n, p) => n + p.amountCents, 0),
    refundedCount: refunded.length,
    buckets,
    byVehicle: group(counted, (r) => [r.vehicle.id, r.vehicle.label]),
    byOwner: group(counted, (r) => [r.vehicle.ownerId, r.vehicle.ownerName]),
    byCategory: group(counted, (r) => [r.vehicle.type, categoryLabel(r.vehicle.type)]),
    byMode: group(counted, (r) => [r.mode, MODE_LABEL[r.mode] ?? r.mode]),
  };
}

/** Change vs the previous period, as a fraction (0.12 = +12%), or null when there's nothing to compare. */
export function change(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null;
}

export type RangePreset = "7d" | "30d" | "90d" | "mtd" | "last-month" | "ytd" | "custom";

/** Resolves a preset (or custom from/to) to Manila days, plus the equally long period before it. */
export function resolveRange(preset: string | undefined, fromParam?: string, toParam?: string, today: Date = manilaDay()) {
  let from: Date;
  let to = today;
  const monthStart = parseDay(`${formatDay(today).slice(0, 7)}-01`)!;
  switch (preset) {
    case "7d":
      from = addDays(today, -6);
      break;
    case "90d":
      from = addDays(today, -89);
      break;
    case "mtd":
      from = monthStart;
      break;
    case "last-month":
      to = addDays(monthStart, -1);
      from = parseDay(`${formatDay(to).slice(0, 7)}-01`)!;
      break;
    case "ytd":
      from = parseDay(`${formatDay(today).slice(0, 4)}-01-01`)!;
      break;
    case "custom": {
      const f = parseDay(fromParam);
      const t = parseDay(toParam);
      if (f && t && f <= t) {
        from = f;
        to = t;
        break;
      }
      from = addDays(today, -29);
      break;
    }
    default:
      from = addDays(today, -29);
  }
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  return { from, to, days, prevFrom: addDays(from, -days), prevTo: addDays(from, -1), preset: (preset ?? "30d") as RangePreset };
}
