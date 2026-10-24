"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAvailability, overlaps, quote } from "@/lib/availability";
import { parseDay, today } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { canManageFleet, type ActionState } from "@/lib/util";

export async function requestBooking(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireCompanyUser();
  if (me.company.status !== "VERIFIED") {
    return { error: "Your company must be verified before it can book." };
  }
  if (!canManageFleet(me.role)) return { error: "Ask an owner or fleet manager to book." };

  const start = parseDay(form.get("start") as string);
  const end = parseDay(form.get("end") as string);
  if (!start || !end) return { error: "Pick a start and end date." };
  if (start < today()) return { error: "The start date is in the past." };

  const vehicle = await db.vehicle.findFirst({
    where: { id: form.get("vehicleId") as string, active: true, blocked: false, company: { status: "VERIFIED" } },
    include: { windows: true, bookings: { where: { status: "CONFIRMED" } } },
  });
  if (!vehicle) return { error: "That vehicle is no longer listed." };
  if (vehicle.companyId === me.companyId) return { error: "You can't book your own vehicle." };

  const availability = checkAvailability(vehicle.windows, vehicle.bookings, start, end);
  if (!availability.ok) return { error: availability.reason };

  const price = quote(vehicle.dailyRateCents, availability.days);
  await db.booking.create({
    data: {
      vehicleId: vehicle.id,
      renterCompanyId: me.companyId,
      requestedById: me.id,
      startDate: start,
      endDate: end,
      days: price.days,
      subtotalCents: price.subtotalCents,
      renterFeeCents: price.renterFeeCents,
      hostFeeCents: price.hostFeeCents,
      note: String(form.get("note") ?? "").trim().slice(0, 500),
    },
  });
  redirect("/bookings?sent=1");
}

/** Host approves or declines a request on one of their vehicles. */
export async function respondToBooking(bookingId: string, decision: "CONFIRMED" | "DECLINED"): Promise<void> {
  const me = await requireCompanyUser();
  if (!canManageFleet(me.role)) return;

  const booking = await db.booking.findFirst({
    where: { id: bookingId, status: "REQUESTED", vehicle: { companyId: me.companyId } },
  });
  if (!booking) return;

  if (decision === "CONFIRMED") {
    const confirmed = await db.$transaction(async (tx) => {
      // Re-check inside the transaction: another request may have been confirmed since.
      const clashes = await tx.booking.findMany({
        where: { vehicleId: booking.vehicleId, status: "CONFIRMED" },
      });
      if (clashes.some((b) => overlaps(b.startDate, b.endDate, booking.startDate, booking.endDate))) {
        return false;
      }
      await tx.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
      return true;
    });
    if (!confirmed) redirect("/bookings?error=clash");
  } else {
    await db.booking.update({ where: { id: booking.id }, data: { status: "DECLINED" } });
  }
  revalidatePath("/bookings");
}

/** Renter withdraws a request that hasn't been answered yet. */
export async function cancelBooking(bookingId: string): Promise<void> {
  const me = await requireCompanyUser();
  await db.booking.updateMany({
    where: { id: bookingId, renterCompanyId: me.companyId, status: "REQUESTED" },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/bookings");
}
