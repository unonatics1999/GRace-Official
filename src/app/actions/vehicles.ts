"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { VEHICLE_TYPES, type VehicleType } from "@/lib/constants";
import { parseDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { canManageFleet, firstError, type ActionState } from "@/lib/util";

const vehicleSchema = z.object({
  name: z.string().trim().min(2, "Give the vehicle a name your team recognises."),
  type: z.enum(Object.keys(VEHICLE_TYPES) as [VehicleType, ...VehicleType[]], {
    message: "Pick a vehicle type.",
  }),
  year: z.coerce.number().int().min(1990, "Enter a year from 1990 on.").max(2030, "Enter a valid year."),
  city: z.string().trim().min(2, "Enter where the vehicle is picked up."),
  equipment: z.string().trim().max(200).default(""),
  description: z.string().trim().max(1000, "Keep the description under 1,000 characters.").default(""),
  dailyRate: z.coerce.number().min(10, "The daily rate must be at least $10.").max(2000, "The daily rate is capped at $2,000."),
});

export async function createVehicle(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireCompanyUser();
  if (!canManageFleet(me.role)) return { error: "Your role can't add vehicles." };

  const parsed = vehicleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { dailyRate, equipment, ...rest } = parsed.data;

  const vehicle = await db.vehicle.create({
    data: {
      ...rest,
      equipment: equipment
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .join(","),
      dailyRateCents: Math.round(dailyRate * 100),
      companyId: me.companyId,
    },
  });
  redirect(`/fleet/${vehicle.id}`);
}

async function ownVehicle(vehicleId: string) {
  const me = await requireCompanyUser();
  if (!canManageFleet(me.role)) return null;
  return db.vehicle.findFirst({ where: { id: vehicleId, companyId: me.companyId } });
}

export async function toggleVehicleActive(vehicleId: string): Promise<void> {
  const vehicle = await ownVehicle(vehicleId);
  if (!vehicle) return;
  await db.vehicle.update({ where: { id: vehicle.id }, data: { active: !vehicle.active } });
  revalidatePath(`/fleet/${vehicle.id}`);
}

export async function addWindow(vehicleId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const vehicle = await ownVehicle(vehicleId);
  if (!vehicle) return { error: "You can't edit this vehicle." };

  const kind = form.get("kind");
  const startDate = parseDay(form.get("startDate") as string);
  const endDate = parseDay(form.get("endDate") as string);
  const weekdays = form
    .getAll("weekdays")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

  if (startDate && endDate && endDate < startDate) return { error: "The end date is before the start date." };

  if (kind === "WEEKLY") {
    if (weekdays.length === 0) return { error: "Tick at least one weekday." };
    await db.downtimeWindow.create({
      data: { vehicleId, kind, weekdays: weekdays.sort().join(","), startDate, endDate },
    });
  } else if (kind === "RANGE") {
    if (!startDate || !endDate) return { error: "A date range needs both a start and an end date." };
    await db.downtimeWindow.create({ data: { vehicleId, kind, startDate, endDate } });
  } else {
    return { error: "Pick weekly or date range." };
  }
  revalidatePath(`/fleet/${vehicleId}`);
  return { ok: "Downtime added." };
}

export async function deleteWindow(windowId: string): Promise<void> {
  const window = await db.downtimeWindow.findUnique({ where: { id: windowId } });
  if (!window || !(await ownVehicle(window.vehicleId))) return;
  await db.downtimeWindow.delete({ where: { id: window.id } });
  revalidatePath(`/fleet/${window.vehicleId}`);
}
