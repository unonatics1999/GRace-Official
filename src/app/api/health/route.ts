import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** For uptime monitors and load balancers: 200 when the app can reach its database. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
