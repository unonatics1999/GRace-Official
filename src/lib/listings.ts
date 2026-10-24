import type { DowntimeWindow, Prisma } from "@prisma/client";
import { parseWeekdays } from "./availability";
import { WEEKDAYS } from "./constants";

/** Listings anyone can see: host switched on, not blocked by an admin, host company verified. */
export const LISTABLE: Prisma.VehicleWhereInput = {
  active: true,
  blocked: false,
  company: { status: "VERIFIED" },
  windows: { some: {} },
};

const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** "Free Mon–Wed", "Free Nov 15 – Feb 21", or a count when there are several windows. */
export function describeDowntime(windows: Pick<DowntimeWindow, "kind" | "weekdays" | "startDate" | "endDate">[]): string {
  if (windows.length === 0) return "No downtime set";
  if (windows.length > 1) return `${windows.length} downtime windows`;
  const [w] = windows;
  if (w.kind === "RANGE" && w.startDate && w.endDate) return `Free ${short(w.startDate)} – ${short(w.endDate)}`;
  const days = parseWeekdays(w.weekdays);
  if (days.join(",") === "0,6") return "Free every weekend";
  if (days.join(",") === "1,2,3,4,5") return "Free every weekday";
  const consecutive = days.length > 2 && days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  const label = consecutive
    ? `${WEEKDAYS[days[0]]}–${WEEKDAYS[days[days.length - 1]]}`
    : days.map((d) => WEEKDAYS[d]).join(", ");
  return `Free every ${label}`;
}

export function equipmentTags(equipment: string): string[] {
  return equipment.split(",").map((t) => t.trim()).filter(Boolean);
}
