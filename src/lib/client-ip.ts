/**
 * The caller's IP address, for rate limits.
 *
 * The first entry of X-Forwarded-For is whatever the client typed, so trusting it lets anyone dodge a
 * per-IP limit by sending a different fake address each time. The reverse proxy in front of the app
 * (Vercel, Nginx, a load balancer) sets X-Real-IP or appends the real address at the END of the list,
 * so those are the values to trust. Production must run behind such a proxy; per-IP limits are
 * backed by per-account and global limits, so a forged address alone never unlocks anything.
 */
export function ipFromHeaders(h: Pick<Headers, "get">): string {
  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const hops = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  return hops.at(-1) ?? "unknown";
}
