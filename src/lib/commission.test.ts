import { describe, expect, it } from "vitest";
import { DEFAULT_COMMISSION, hostCommissionBps, priceBooking, ratingTier } from "./commission";

const s = DEFAULT_COMMISSION;
const driver = (avg: number, count: number) => ({ ratingSum: Math.round(avg * count), ratingCount: count });

describe("hostCommissionBps", () => {
  it("uses the category base rate without a driver", () => {
    expect(hostCommissionBps(s, "SEDAN", null)).toBe(1500);
    expect(hostCommissionBps(s, "VAN", null)).toBe(1800);
  });

  it("gives new drivers with no reviews the base rate", () => {
    expect(hostCommissionBps(s, "MPV", { ratingSum: 0, ratingCount: 0 })).toBe(1500);
  });

  it("lowers commission as the rating rises", () => {
    expect(hostCommissionBps(s, "SEDAN", driver(4.2, 3))).toBe(1300);
    expect(hostCommissionBps(s, "SEDAN", driver(4.6, 5))).toBe(1100);
    expect(hostCommissionBps(s, "SEDAN", driver(4.9, 10))).toBe(900);
  });

  it("requires enough reviews for a tier", () => {
    // 5.0 average from only 2 reviews doesn't qualify for any tier yet.
    expect(hostCommissionBps(s, "SEDAN", driver(5, 2))).toBe(1500);
    // 4.9 from 6 reviews gets the 4.5 tier, not the 4.8 one.
    expect(hostCommissionBps(s, "SEDAN", driver(4.9, 6))).toBe(1100);
  });

  it("never goes below the floor", () => {
    expect(hostCommissionBps({ ...s, floorBps: 1000 }, "SEDAN", driver(5, 50))).toBe(1000);
  });

  it("falls back to the highest base rate for an unknown category", () => {
    expect(hostCommissionBps(s, "LIMOUSINE", null)).toBe(1800);
  });
});

describe("ratingTier", () => {
  it("returns null below every tier", () => {
    expect(ratingTier(s, 3.9, 20)).toBeNull();
  });
});

describe("priceBooking", () => {
  it("builds a with-driver price and splits earnings", () => {
    const p = priceBooking({
      days: 2,
      dailyRateCents: 250_000, // ₱2,500
      driverDailyRateCents: 100_000, // ₱1,000
      withDriver: true,
      renterFeeBps: 1000,
      hostCommissionBps: 1500,
    });
    expect(p).toEqual({
      days: 2,
      vehicleCents: 500_000,
      driverCents: 200_000,
      renterFeeBps: 1000,
      renterFeeCents: 70_000,
      hostCommissionBps: 1500,
      hostFeeCents: 105_000,
      renterTotalCents: 770_000,
      hostPayoutCents: 595_000,
      platformEarningsCents: 175_000,
    });
  });

  it("charges no driver fee for self-drive", () => {
    const p = priceBooking({ days: 1, dailyRateCents: 250_000, driverDailyRateCents: 100_000, withDriver: false, renterFeeBps: 1000, hostCommissionBps: 1500 });
    expect(p.driverCents).toBe(0);
    expect(p.renterTotalCents).toBe(275_000);
  });
});
