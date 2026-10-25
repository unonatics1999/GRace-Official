import { BLOCKING_STATUSES } from "./availability";
import { db } from "./db";
import { listableWhere, listingInclude } from "./listings";

// Live listings are read on every home, explore and car page but change rarely, so keep them in
// memory for a few seconds. Writes that change a listing or its calendar call invalidateListings().
// Display only: booking requests always re-check availability against the database.
// (With several server instances, each keeps its own copy; staleness is bounded by the TTL.)

const TTL_MS = 10_000;

async function load() {
  return db.vehicle.findMany({
    where: listableWhere(),
    include: {
      ...listingInclude,
      bookings: { where: { status: { in: BLOCKING_STATUSES } } },
    },
    orderBy: { dailyRateCents: "asc" },
  });
}

export type CachedListing = Awaited<ReturnType<typeof load>>[number];

let cache: { at: number; data: Promise<CachedListing[]> } | null = null;

export function getLiveListings(): Promise<CachedListing[]> {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    const data = load();
    cache = { at: Date.now(), data };
    // Don't keep a failed load around.
    data.catch(() => {
      if (cache?.data === data) cache = null;
    });
  }
  return cache.data;
}

export function invalidateListings(): void {
  cache = null;
}
