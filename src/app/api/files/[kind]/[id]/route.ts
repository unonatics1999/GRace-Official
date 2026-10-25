import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listableWhere } from "@/lib/listings";
import { currentUser } from "@/lib/session";
import { readFile } from "@/lib/storage";

// Serves stored files with an access check per kind:
// - vehicle-photo: public when the listing is live; otherwise the host and admins.
// - inspection-photo: the two parties of the booking and admins.
// - document: the account that uploaded it and admins only.

type Found = { storageKey: string; contentType: string; isPublic: boolean; allowedCompanyIds: string[] };

async function find(kind: string, id: string): Promise<Found | null> {
  if (kind === "vehicle-photo") {
    const p = await db.vehiclePhoto.findUnique({ where: { id }, include: { vehicle: true } });
    if (!p) return null;
    const live = await db.vehicle.count({ where: { id: p.vehicleId, ...listableWhere() } });
    return { ...p, isPublic: live > 0, allowedCompanyIds: [p.vehicle.companyId] };
  }
  if (kind === "inspection-photo") {
    const p = await db.photo.findUnique({
      where: { id },
      include: { inspection: { include: { booking: { include: { vehicle: true } } } } },
    });
    if (!p) return null;
    const b = p.inspection.booking;
    return { ...p, isPublic: false, allowedCompanyIds: [b.renterCompanyId, b.vehicle.companyId] };
  }
  if (kind === "document") {
    const d = await db.document.findUnique({
      where: { id },
      include: { vehicle: true, driver: { include: { user: true } } },
    });
    if (!d) return null;
    const owner = d.companyId ?? d.vehicle?.companyId ?? d.driver?.user.companyId ?? null;
    return { ...d, isPublic: false, allowedCompanyIds: owner ? [owner] : [] };
  }
  return null;
}

export async function GET(_: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const file = await find(kind, id);
  if (!file) return new NextResponse("Not found", { status: 404 });

  if (!file.isPublic) {
    const user = await currentUser();
    const allowed = user && (user.isAdmin || (user.companyId && file.allowedCompanyIds.includes(user.companyId)));
    // 404 rather than 403, so private files can't be probed for.
    if (!allowed) return new NextResponse("Not found", { status: 404 });
  }

  try {
    const bytes = await readFile(file.storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": file.isPublic ? "public, max-age=604800, stale-while-revalidate=86400" : "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
