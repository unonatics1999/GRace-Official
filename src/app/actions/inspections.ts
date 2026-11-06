"use server";

import { revalidatePath } from "next/cache";
import { MAX_PHOTO_BYTES, PHOTO_ANGLES, REQUIRED_PHOTO_ANGLES, type PhotoAngle } from "@/lib/constants";
import { db } from "@/lib/db";
import { invalidateListings } from "@/lib/listing-cache";
import { canConfirmInspection, canStartPickup, canStartReturn, statusAfterConfirmed, type Party } from "@/lib/lifecycle";
import { requireCompanyUser, type CompanyUser } from "@/lib/session";
import { detectImageType, saveFile } from "@/lib/storage";
import type { ActionState } from "@/lib/util";

async function loadForParty(bookingId: string, me: CompanyUser) {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, OR: [{ renterCompanyId: me.companyId }, { vehicle: { companyId: me.companyId } }] },
    include: { vehicle: true, inspections: true },
  });
  if (!booking) return null;
  const party: Party = booking.vehicle.companyId === me.companyId ? "host" : "renter";
  return { booking, party };
}

/** Saves the pick-up or return checklist: odometer, fuel, notes and one photo per angle. */
export async function submitInspection(bookingId: string, phase: "PICKUP" | "RETURN", form: FormData): Promise<ActionState> {
  // Server actions can be called with any arguments, so the type annotation isn't enough.
  if (phase !== "PICKUP" && phase !== "RETURN") return { error: "Unknown checklist." };
  const me = await requireCompanyUser();
  const loaded = await loadForParty(bookingId, me);
  if (!loaded) return { error: "Booking not found." };
  const { booking } = loaded;

  const allowed = phase === "PICKUP" ? canStartPickup(booking) : canStartReturn(booking);
  if (!allowed) return { error: phase === "PICKUP" ? "The pick-up checklist opens the day before pick-up." : "Return opens after pick-up." };
  if (booking.inspections.some((i) => i.phase === phase)) return { error: "This checklist has already been submitted." };

  const odometerKm = Number(form.get("odometerKm"));
  const fuelQuarters = Number(form.get("fuelQuarters"));
  if (!Number.isInteger(odometerKm) || odometerKm < 0 || odometerKm > 2_000_000) return { error: "Enter the odometer reading in km." };
  if (!Number.isInteger(fuelQuarters) || fuelQuarters < 0 || fuelQuarters > 4) return { error: "Pick the fuel level." };

  const pickup = booking.inspections.find((i) => i.phase === "PICKUP");
  if (phase === "RETURN" && pickup && odometerKm < pickup.odometerKm) {
    return { error: `The odometer can't be lower than at pick-up (${pickup.odometerKm.toLocaleString()} km).` };
  }

  // Validate every photo before saving any of them.
  const photos: { angle: PhotoAngle; bytes: Buffer; type: string; ext: string }[] = [];
  for (const angle of Object.keys(PHOTO_ANGLES) as PhotoAngle[]) {
    const file = form.get(`photo_${angle}`);
    if (!(file instanceof File) || file.size === 0) {
      if (REQUIRED_PHOTO_ANGLES.includes(angle)) return { error: `Add a photo: ${PHOTO_ANGLES[angle]}.` };
      continue;
    }
    if (file.size > MAX_PHOTO_BYTES) return { error: `${PHOTO_ANGLES[angle]} photo is too large (max 5 MB).` };
    const bytes = Buffer.from(await file.arrayBuffer());
    const detected = detectImageType(bytes);
    if (!detected) return { error: `${PHOTO_ANGLES[angle]} must be a JPEG, PNG or WebP photo.` };
    photos.push({ angle, bytes, ...detected });
  }

  const saved = await Promise.all(
    photos.map(async (p) => ({
      angle: p.angle,
      storageKey: await saveFile(p.bytes, p.ext, `inspections/${booking.id}`),
      contentType: p.type,
      sizeBytes: p.bytes.length,
    })),
  );

  await db.inspection.create({
    data: {
      bookingId: booking.id,
      phase,
      odometerKm,
      fuelQuarters,
      notes: String(form.get("notes") ?? "").trim().slice(0, 1000),
      createdById: me.id,
      photos: { create: saved },
    },
  });
  invalidateListings();
  revalidatePath(`/bookings/${booking.id}`);
  return { ok: "Checklist saved. The other company now confirms it." };
}

/** The other party agrees the checklist matches the vehicle; this moves the booking on. */
export async function confirmInspection(inspectionId: string): Promise<void> {
  const me = await requireCompanyUser();
  const inspection = await db.inspection.findUnique({
    where: { id: inspectionId },
    include: { createdBy: true, booking: { include: { vehicle: true } } },
  });
  if (!inspection) return;
  const loaded = await loadForParty(inspection.bookingId, me);
  if (!loaded) return;
  const { booking, party } = loaded;

  const creatorParty: Party = inspection.createdBy.companyId === booking.vehicle.companyId ? "host" : "renter";
  if (!canConfirmInspection(creatorParty, party, inspection.confirmedAt !== null)) return;

  const now = new Date();
  const phase = inspection.phase as "PICKUP" | "RETURN";
  const nextStatus = statusAfterConfirmed(phase);
  const expectedStatus = phase === "PICKUP" ? "CONFIRMED" : "IN_PROGRESS";
  if (booking.status !== expectedStatus) return;

  await db.$transaction(async (tx) => {
    await tx.inspection.update({ where: { id: inspection.id }, data: { confirmedById: me.id, confirmedAt: now } });
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: nextStatus, ...(phase === "PICKUP" ? { pickedUpAt: now } : { returnedAt: now }) },
    });
    if (nextStatus === "COMPLETED") {
      const issueOpen = booking.issueOpenedAt !== null && booking.issueResolvedAt === null;
      await tx.payout.create({
        data: {
          bookingId: booking.id,
          companyId: booking.vehicle.companyId,
          amountCents: booking.vehicleCents + booking.driverCents - booking.hostFeeCents,
          status: issueOpen ? "ON_HOLD" : "PENDING",
        },
      });
    }
  });
  invalidateListings();
  revalidatePath(`/bookings/${booking.id}`);
}
