import type { DowntimeWindow, Prisma } from "@prisma/client";
import { parseWeekdays } from "./availability";
import { WEEKDAYS } from "./constants";
import { today } from "./dates";

/**
 * Listings anyone can see: approved by Downtime, switched on by the host, not hidden by an admin,
 * host account verified, registration and CTPL insurance still valid, and some availability set.
 */
export function listableWhere(): Prisma.VehicleWhereInput {
  const now = today();
  return {
    reviewStatus: "APPROVED",
    active: true,
    blocked: false,
    company: { status: "VERIFIED" },
    registrationExpiry: { gte: now },
    insuranceExpiry: { gte: now },
    windows: { some: {} },
  };
}

/** A vehicle can be booked with a driver only when its driver is approved. */
export function driverBookable(v: { withDriverAllowed: boolean; driver: { status: string } | null }): boolean {
  return v.withDriverAllowed && v.driver?.status === "APPROVED";
}

const short = (d: Date) => d.toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });

/** "Free every Mon–Wed", "Free Nov 15 – Feb 21", or a count when there are several windows. */
export function describeDowntime(windows: Pick<DowntimeWindow, "kind" | "weekdays" | "startDate" | "endDate">[]): string {
  if (windows.length === 0) return "No availability set";
  if (windows.length > 1) return `${windows.length} availability windows`;
  const [w] = windows;
  if (w.kind === "RANGE" && w.startDate && w.endDate) return `Free ${short(w.startDate)} – ${short(w.endDate)}`;
  // Monday-first, so a Fri–Sun window reads as one run.
  const days = parseWeekdays(w.weekdays).sort((a, b) => (a || 7) - (b || 7));
  if (days.length === 7) return "Free every day";
  if (days.join(",") === "6,0") return "Free every weekend";
  if (days.join(",") === "1,2,3,4,5") return "Free every weekday";
  const consecutive = days.length > 2 && days.every((d, i) => i === 0 || (d || 7) === (days[i - 1] || 7) + 1);
  const label = consecutive
    ? `${WEEKDAYS[days[0]]}–${WEEKDAYS[days[days.length - 1]]}`
    : days.map((d) => WEEKDAYS[d]).join(", ");
  return `Free every ${label}`;
}

export function equipmentTags(equipment: string): string[] {
  return equipment.split(",").map((t) => t.trim()).filter(Boolean);
}

export function vehicleTitle(v: { make: string; model: string; year: number }): string {
  return `${v.make} ${v.model} ${v.year}`;
}

export function photoUrl(photoId: string): string {
  return `/api/files/vehicle-photo/${photoId}`;
}

/** What every listing card and page loads. */
export const listingInclude = {
  company: true,
  windows: true,
  photos: { orderBy: { position: "asc" as const } },
  driver: { include: { user: true } },
} satisfies Prisma.VehicleInclude;

export type ListingVehicle = Prisma.VehicleGetPayload<{ include: typeof listingInclude }>;
