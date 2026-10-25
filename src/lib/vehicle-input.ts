import { z } from "zod";
import { FUEL_TYPES, TRANSMISSIONS, VEHICLE_TYPES, type VehicleType } from "./constants";
import { parseDay, today } from "./dates";
import { VEHICLE_RULES } from "./requirements";
import { firstError } from "./util";

// Parses the vehicle form (owner's fleet page and the admin console share it).

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];
const day = z.string().refine((v) => parseDay(v) !== null, "Enter a valid date.");
const peso = (min: number, max: number, label: string) =>
  z.coerce.number().min(min, `${label} must be at least ₱${min.toLocaleString()}.`).max(max, `${label} is capped at ₱${max.toLocaleString()}.`);

const vehicleSchema = z.object({
  type: z.enum(keys(VEHICLE_TYPES), { message: "Pick a vehicle type." }),
  make: z.string().trim().min(2, "Enter the make, e.g. Toyota.").max(40),
  model: z.string().trim().min(1, "Enter the model, e.g. Vios.").max(40),
  year: z.coerce.number().int().min(new Date().getFullYear() - VEHICLE_RULES.maxAgeYears, `Vehicles must be ${VEHICLE_RULES.maxAgeYears} years old or newer.`).max(new Date().getFullYear() + 1, "Enter a valid year."),
  color: z.string().trim().min(3, "Enter the colour.").max(30),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1c1c1c"),
  plateNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,3}\s?\d{3,4}$|^\d{3,4}\s?[A-Z]{2,3}$/, "Enter the plate as on the CR, e.g. NBC 1234."),
  seats: z.coerce.number().int().min(2).max(30),
  transmission: z.enum(keys(TRANSMISSIONS)),
  fuelType: z.enum(keys(FUEL_TYPES)),
  city: z.string().trim().min(2, "Enter the pick-up city."),
  equipment: z.string().trim().max(200).default(""),
  description: z.string().trim().max(1000).default(""),
  registrationExpiry: day,
  insuranceExpiry: day,
  dailyRate: peso(500, 50_000, "The daily rate"),
  selfDriveAllowed: z.preprocess((v) => v === "on", z.boolean()),
  withDriverAllowed: z.preprocess((v) => v === "on", z.boolean()),
  driverDailyRate: z.coerce.number().min(0).max(10_000).default(0),
});

export function vehicleData(form: FormData) {
  const parsed = vehicleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) } as const;
  const v = parsed.data;
  if (!v.selfDriveAllowed && !v.withDriverAllowed) return { error: "Offer self-drive, with driver, or both." } as const;
  if (v.withDriverAllowed && v.driverDailyRate < 500) return { error: "Set a driver rate of at least ₱500 a day." } as const;
  const registrationExpiry = parseDay(v.registrationExpiry)!;
  const insuranceExpiry = parseDay(v.insuranceExpiry)!;
  if (registrationExpiry < today()) return { error: "The LTO registration has expired. Renew it before listing." } as const;
  if (insuranceExpiry < today()) return { error: "The CTPL insurance has expired. Renew it before listing." } as const;
  const { dailyRate, driverDailyRate, ...rest } = v;
  return {
    data: {
      ...rest,
      type: rest.type as VehicleType,
      plateNumber: rest.plateNumber.replace(/\s+/g, " "),
      equipment: rest.equipment.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).join(","),
      registrationExpiry,
      insuranceExpiry,
      dailyRateCents: Math.round(dailyRate * 100),
      driverDailyRateCents: v.withDriverAllowed ? Math.round(driverDailyRate * 100) : 0,
    },
  } as const;
}

