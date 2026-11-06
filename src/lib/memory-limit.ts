// Small in-memory sliding-window limiter for public endpoints (signup, password reset, help chat).
// Per server instance; the database-backed login limiter in rate-limit.ts covers what must hold
// across instances. Old keys are evicted one by one, never all at once, so flooding the map with
// fake keys can't reset everyone's limit.

const MAX_KEYS = 10_000;
const buckets = new Map<string, number[]>();

/** Records a hit and returns true when `key` has gone over `limit` hits within `windowMs`. */
export function overLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.delete(key);
  buckets.set(key, recent);
  // Maps keep insertion order, so the first key is the least recently used.
  while (buckets.size > MAX_KEYS) buckets.delete(buckets.keys().next().value!);
  return recent.length > limit;
}
