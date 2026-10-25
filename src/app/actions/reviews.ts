"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import type { ActionState } from "@/lib/util";

/** The renter rates a completed trip. The driver's rating sets their commission tier. */
export async function submitReview(bookingId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireCompanyUser();
  const booking = await db.booking.findFirst({
    where: { id: bookingId, renterCompanyId: me.companyId, status: "COMPLETED" },
    include: { review: true },
  });
  if (!booking) return { error: "You can rate a trip once it's completed." };
  if (booking.review) return { error: "You've already rated this trip." };

  const vehicleRating = Number(form.get("vehicleRating"));
  const driverRating = booking.driverId ? Number(form.get("driverRating")) : null;
  const valid = (n: number | null) => n !== null && Number.isInteger(n) && n >= 1 && n <= 5;
  if (!valid(vehicleRating)) return { error: "Rate the vehicle from 1 to 5 stars." };
  if (booking.driverId && !valid(driverRating)) return { error: "Rate the driver from 1 to 5 stars." };

  await db.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        bookingId: booking.id,
        authorId: me.id,
        vehicleRating,
        driverRating,
        comment: String(form.get("comment") ?? "").trim().slice(0, 1000),
      },
    });
    if (booking.driverId && driverRating) {
      await tx.driver.update({
        where: { id: booking.driverId },
        data: { ratingSum: { increment: driverRating }, ratingCount: { increment: 1 } },
      });
    }
  });
  revalidatePath(`/bookings/${booking.id}`);
  return { ok: "Thanks for rating your trip." };
}
