import { describe, expect, it } from "vitest";
import { parseDay } from "./dates";
import { canConfirmInspection, canPay, canStartPickup, compareInspections, paymentDeadline } from "./lifecycle";

const d = (s: string) => parseDay(s)!;

describe("paymentDeadline", () => {
  it("gives 24 hours when the rental is further away", () => {
    const approved = new Date("2026-11-01T02:00:00Z");
    expect(paymentDeadline(approved, d("2026-11-10")).toISOString()).toBe("2026-11-02T02:00:00.000Z");
  });

  it("never runs past midnight Manila time on the start day", () => {
    const approved = new Date("2026-11-01T10:00:00Z"); // 6 PM Manila
    // Start Nov 2 → Manila midnight is Nov 1, 16:00 UTC.
    expect(paymentDeadline(approved, d("2026-11-02")).toISOString()).toBe("2026-11-01T16:00:00.000Z");
  });
});

describe("canPay", () => {
  it("allows paying only while the window is open", () => {
    const now = new Date("2026-11-01T12:00:00Z");
    const b = { status: "AWAITING_PAYMENT", startDate: d("2026-11-10"), paymentDueAt: new Date("2026-11-01T13:00:00Z") };
    expect(canPay(b, now)).toBe(true);
    expect(canPay({ ...b, paymentDueAt: new Date("2026-11-01T11:00:00Z") }, now)).toBe(false);
    expect(canPay({ ...b, status: "REQUESTED" }, now)).toBe(false);
  });
});

describe("canStartPickup", () => {
  it("opens the day before pick-up, Manila time", () => {
    const b = { status: "CONFIRMED", startDate: d("2026-11-10") };
    expect(canStartPickup(b, new Date("2026-11-08T15:00:00Z"))).toBe(false); // Nov 8, 11 PM Manila
    expect(canStartPickup(b, new Date("2026-11-08T16:30:00Z"))).toBe(true); // Nov 9, 12:30 AM Manila
  });
});

describe("canConfirmInspection", () => {
  it("must be confirmed by the other party, once", () => {
    expect(canConfirmInspection("host", "renter", false)).toBe(true);
    expect(canConfirmInspection("host", "host", false)).toBe(false);
    expect(canConfirmInspection("host", "renter", true)).toBe(false);
  });
});

describe("compareInspections", () => {
  it("reports distance and fuel change", () => {
    expect(compareInspections({ odometerKm: 10_000, fuelQuarters: 4 }, { odometerKm: 10_250, fuelQuarters: 2 })).toEqual({
      distanceKm: 250,
      fuelChangeQuarters: -2,
      odometerWentBack: false,
    });
  });
});
