import { NextResponse, type NextRequest } from "next/server";
import { ipFromHeaders } from "@/lib/client-ip";
import { inspectRequest } from "@/lib/firewall";
import { overLimit } from "@/lib/memory-limit";

// Every request passes through here first (see src/lib/firewall.ts for the rules).
// Writes are also rate-limited per address: no person submits 60 forms a minute.
const WRITES_PER_MINUTE = 60;

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const length = request.headers.get("content-length");
  const verdict = inspectRequest({
    method: request.method,
    pathname,
    search,
    userAgent: request.headers.get("user-agent") ?? "",
    contentLength: length === null ? null : Number(length),
  });
  if (verdict) return new NextResponse(verdict.status === 404 ? "Not found" : "Request blocked", { status: verdict.status });

  const write = request.method !== "GET" && request.method !== "HEAD";
  // PayMongo's webhook is verified by signature instead.
  if (write && !pathname.startsWith("/api/webhooks/") && overLimit(`write:${ipFromHeaders(request.headers)}`, WRITES_PER_MINUTE, 60_000)) {
    return new NextResponse("Too many requests. Slow down and try again in a minute.", { status: 429, headers: { "Retry-After": "60" } });
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next's own static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
