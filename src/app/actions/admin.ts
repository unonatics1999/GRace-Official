"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const COMPANY_STATUSES = ["VERIFIED", "REJECTED", "SUSPENDED"] as const;

export async function setCompanyStatus(companyId: string, status: (typeof COMPANY_STATUSES)[number]): Promise<void> {
  await requireAdmin();
  if (!COMPANY_STATUSES.includes(status)) return;
  await db.company.update({ where: { id: companyId }, data: { status } });
  revalidatePath("/admin", "layout");
}

/** Hide or restore a listing regardless of the host's own switch. */
export async function setVehicleBlocked(vehicleId: string, blocked: boolean): Promise<void> {
  await requireAdmin();
  await db.vehicle.update({ where: { id: vehicleId }, data: { blocked } });
  revalidatePath("/admin", "layout");
}

/** Support override: cancel a booking that is still open. */
export async function adminCancelBooking(bookingId: string): Promise<void> {
  await requireAdmin();
  await db.booking.updateMany({
    where: { id: bookingId, status: { in: ["REQUESTED", "CONFIRMED"] } },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/admin", "layout");
}
