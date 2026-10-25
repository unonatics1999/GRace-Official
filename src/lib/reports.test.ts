import { describe, expect, it } from "vitest";
import { parseDay } from "./dates";
import { bucketStart, buildReport, change, pickGranularity, resolveRange, type PaidBooking } from "./reports";

const d = (s: string) => parseDay(s)!;
// 10:00 Manila on the given day.
const paidOn = (s: string) => new Date(`${s}T02:00:00.000Z`);

function booking(over: Partial<PaidBooking> & { day: string }): PaidBooking {
  const { day, ...rest } = over;
  return {
    id: Math.random().toString(36),
    paidAt: paidOn(day),
    amountCents: 396_000,
    refundNeeded: false,
    renterFeeCents: 36_000,
    hostFeeCents: 54_000,
    vehicleCents: 360_000,
    driverCents: 0,
    mode: "SELF_DRIVE",
    vehicle: { id: "v1", label: "Vios", type: "SEDAN", ownerId: "o1", ownerName: "Fleet" },
    ...rest,
  };
}

describe("buildReport", () => {
  const label = (t: string) => t;

  it("adds service fees and commission into earnings, and keeps owner share separate", () => {
    const r = buildReport([booking({ day: "2026-10-05" }), booking({ day: "2026-10-06", mode: "WITH_DRIVER" })], d("2026-10-01"), d("2026-10-31"), label);
    expect(r.earningsCents).toBe(180_000);
    expect(r.serviceFeeCents).toBe(72_000);
    expect(r.commissionCents).toBe(108_000);
    expect(r.gmvCents).toBe(792_000);
    expect(r.ownerShareCents).toBe(612_000);
    expect(r.takeRate).toBeCloseTo(180_000 / 792_000);
    expect(r.byMode.map((m) => m.label).sort()).toEqual(["Self-drive", "With driver"]);
  });

  it("excludes refunded payments from earnings and reports them separately", () => {
    const r = buildReport([booking({ day: "2026-10-05" }), booking({ day: "2026-10-05", refundNeeded: true })], d("2026-10-01"), d("2026-10-31"), label);
    expect(r.bookings).toBe(1);
    expect(r.refundedCount).toBe(1);
    expect(r.refundedCents).toBe(396_000);
  });

  it("counts a payment on its Manila day, not its UTC day", () => {
    // 2026-10-31 17:00 UTC is Nov 1, 01:00 in Manila.
    const late = booking({ day: "2026-10-31", paidAt: new Date("2026-10-31T17:00:00.000Z") });
    expect(buildReport([late], d("2026-10-01"), d("2026-10-31"), label).bookings).toBe(0);
    expect(buildReport([late], d("2026-11-01"), d("2026-11-30"), label).bookings).toBe(1);
  });

  it("creates an empty bucket for every day in a short range", () => {
    const r = buildReport([booking({ day: "2026-10-03" })], d("2026-10-01"), d("2026-10-07"), label);
    expect(r.buckets).toHaveLength(7);
    expect(r.buckets[2].bookings).toBe(1);
  });
});

describe("granularity and buckets", () => {
  it("uses days, weeks, then months as the range grows", () => {
    expect(pickGranularity(d("2026-10-01"), d("2026-10-31"))).toBe("day");
    expect(pickGranularity(d("2026-01-01"), d("2026-10-31"))).toBe("week");
    expect(pickGranularity(d("2024-01-01"), d("2026-10-31"))).toBe("month");
  });

  it("starts weeks on Monday", () => {
    // 2026-10-25 is a Sunday; its week started Monday 2026-10-19.
    expect(bucketStart(d("2026-10-25"), "week").toISOString().slice(0, 10)).toBe("2026-10-19");
    expect(bucketStart(d("2026-10-25"), "month").toISOString().slice(0, 10)).toBe("2026-10-01");
  });
});

describe("resolveRange", () => {
  const today = d("2026-10-25");

  it("resolves presets and the comparison period", () => {
    const r = resolveRange("7d", undefined, undefined, today);
    expect([r.from, r.to, r.prevFrom, r.prevTo].map((x) => x.toISOString().slice(0, 10))).toEqual(["2026-10-19", "2026-10-25", "2026-10-12", "2026-10-18"]);
    const last = resolveRange("last-month", undefined, undefined, today);
    expect([last.from, last.to].map((x) => x.toISOString().slice(0, 10))).toEqual(["2026-09-01", "2026-09-30"]);
  });

  it("falls back to the last 30 days for a bad custom range", () => {
    expect(resolveRange("custom", "2026-10-20", "2026-10-01", today).days).toBe(30);
  });
});

describe("change", () => {
  it("is null without a previous period", () => {
    expect(change(100, 0)).toBeNull();
    expect(change(150, 100)).toBeCloseTo(0.5);
  });
});
