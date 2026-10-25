// How Downtime earns on every booking, and how a booking's price is built. Pure functions;
// the rates come from admin settings (src/lib/settings.ts).
//
// Renter pays:  vehicle + driver + renter service fee
// Host gets:    vehicle + driver − host commission
// Downtime earns the renter fee plus the host commission.
//
// Host commission = the vehicle category's base rate, reduced for well-rated drivers:
// the better the driver's rating, the more of each booking the host keeps.

export type RatingTier = { minRating: number; minReviews: number; discountBps: number };

export type CommissionSettings = {
  renterFeeBps: number;
  baseBps: Record<string, number>;
  /** Checked from the top: the first tier a driver qualifies for applies. */
  tiers: RatingTier[];
  /** Commission never drops below this. */
  floorBps: number;
};

export const DEFAULT_COMMISSION: CommissionSettings = {
  renterFeeBps: 1000,
  baseBps: { SEDAN: 1500, MPV: 1500, SUV: 1500, VAN: 1800, PICKUP: 1800 },
  tiers: [
    { minRating: 4.8, minReviews: 10, discountBps: 600 },
    { minRating: 4.5, minReviews: 5, discountBps: 400 },
    { minRating: 4.0, minReviews: 3, discountBps: 200 },
  ],
  floorBps: 500,
};

export function averageRating(ratingSum: number, ratingCount: number): number | null {
  return ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 100) / 100 : null;
}

export function ratingTier(settings: CommissionSettings, rating: number | null, reviews: number): RatingTier | null {
  if (rating === null) return null;
  const sorted = [...settings.tiers].sort((a, b) => b.minRating - a.minRating);
  return sorted.find((t) => rating >= t.minRating && reviews >= t.minReviews) ?? null;
}

/** The host commission for a vehicle category and its driver's rating, in basis points. */
export function hostCommissionBps(
  settings: CommissionSettings,
  vehicleType: string,
  driver: { ratingSum: number; ratingCount: number } | null,
): number {
  const base = settings.baseBps[vehicleType] ?? Math.max(...Object.values(settings.baseBps));
  const tier = driver ? ratingTier(settings, averageRating(driver.ratingSum, driver.ratingCount), driver.ratingCount) : null;
  return Math.max(settings.floorBps, base - (tier?.discountBps ?? 0));
}

export type PriceBreakdown = {
  days: number;
  vehicleCents: number;
  driverCents: number;
  renterFeeBps: number;
  renterFeeCents: number;
  hostCommissionBps: number;
  hostFeeCents: number;
  renterTotalCents: number;
  hostPayoutCents: number;
  platformEarningsCents: number;
};

export function priceBooking(input: {
  days: number;
  dailyRateCents: number;
  driverDailyRateCents: number;
  withDriver: boolean;
  renterFeeBps: number;
  hostCommissionBps: number;
}): PriceBreakdown {
  const vehicleCents = input.dailyRateCents * input.days;
  const driverCents = input.withDriver ? input.driverDailyRateCents * input.days : 0;
  const base = vehicleCents + driverCents;
  const renterFeeCents = Math.round((base * input.renterFeeBps) / 10_000);
  const hostFeeCents = Math.round((base * input.hostCommissionBps) / 10_000);
  return {
    days: input.days,
    vehicleCents,
    driverCents,
    renterFeeBps: input.renterFeeBps,
    renterFeeCents,
    hostCommissionBps: input.hostCommissionBps,
    hostFeeCents,
    renterTotalCents: base + renterFeeCents,
    hostPayoutCents: base - hostFeeCents,
    platformEarningsCents: renterFeeCents + hostFeeCents,
  };
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toLocaleString("en-PH", { maximumFractionDigits: 2 })}%`;
}
