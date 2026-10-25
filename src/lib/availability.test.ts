import { describe, expect, it } from "vitest";
import { checkAvailability, dayInDowntime, isBlocking, type BookingLike, type WindowLike } from "./availability";
import { parseDay } from "./dates";

const d = (s: string) => parseDay(s)!;

// 2026-11-02 is a Monday.
const monToWed: WindowLike = { kind: "WEEKLY", weekdays: "1,2,3", startDate: null, endDate: null };
const winter: WindowLike = {
  kind: "RANGE",
  weekdays: "",
  startDate: d("2026-11-15"),
  endDate: d("2027-03-01"),
};

describe("dayInDowntime", () => {
  it("matches weekly windows by weekday", () => {
    expect(dayInDowntime([monToWed], d("2026-11-02"))).toBe(true); // Mon
    expect(dayInDowntime([monToWed], d("2026-11-04"))).toBe(true); // Wed
    expect(dayInDowntime([monToWed], d("2026-11-05"))).toBe(false); // Thu
  });

  it("respects bounds on a weekly window", () => {
    const bounded = { ...monToWed, startDate: d("2026-11-09") };
    expect(dayInDowntime([bounded], d("2026-11-02"))).toBe(false);
    expect(dayInDowntime([bounded], d("2026-11-09"))).toBe(true);
  });

  it("matches range windows inclusively", () => {
    expect(dayInDowntime([winter], d("2026-11-14"))).toBe(false);
    expect(dayInDowntime([winter], d("2026-11-15"))).toBe(true);
    expect(dayInDowntime([winter], d("2027-03-01"))).toBe(true);
    expect(dayInDowntime([winter], d("2027-03-02"))).toBe(false);
  });

  it("is never idle without windows", () => {
    expect(dayInDowntime([], d("2026-11-02"))).toBe(false);
  });
});

describe("checkAvailability", () => {
  const confirmed: BookingLike = {
    startDate: d("2026-12-01"),
    endDate: d("2026-12-05"),
    status: "CONFIRMED",
  };

  it("accepts a period fully inside downtime", () => {
    expect(checkAvailability([monToWed], [], d("2026-11-02"), d("2026-11-04"))).toEqual({
      ok: true,
      days: 3,
    });
  });

  it("rejects a period that spills outside downtime", () => {
    const result = checkAvailability([monToWed], [], d("2026-11-02"), d("2026-11-05"));
    expect(result.ok).toBe(false);
  });

  it("rejects overlap with a confirmed booking, edges included", () => {
    expect(checkAvailability([winter], [confirmed], d("2026-12-05"), d("2026-12-07")).ok).toBe(false);
    expect(checkAvailability([winter], [confirmed], d("2026-11-28"), d("2026-12-01")).ok).toBe(false);
  });

  it("allows periods touching but not overlapping a booking", () => {
    expect(checkAvailability([winter], [confirmed], d("2026-12-06"), d("2026-12-08")).ok).toBe(true);
  });

  it("ignores requests, declines and cancellations", () => {
    const others = ["REQUESTED", "DECLINED", "CANCELLED"].map((status) => ({ ...confirmed, status }));
    expect(checkAvailability([winter], others, d("2026-12-01"), d("2026-12-05")).ok).toBe(true);
  });

  it("rejects reversed and over-long periods", () => {
    expect(checkAvailability([winter], [], d("2026-12-05"), d("2026-12-01")).ok).toBe(false);
    expect(checkAvailability([winter], [], d("2026-11-15"), d("2027-03-01")).ok).toBe(false);
  });
});

describe("isBlocking", () => {
  const now = new Date("2026-11-01T00:00:00Z");
  const base = { startDate: d("2026-12-01"), endDate: d("2026-12-02") };

  it("holds dates while an approved booking is inside its payment window", () => {
    expect(isBlocking({ ...base, status: "AWAITING_PAYMENT", paymentDueAt: new Date("2026-11-01T12:00:00Z") }, now)).toBe(true);
  });

  it("releases dates once the payment window lapses", () => {
    expect(isBlocking({ ...base, status: "AWAITING_PAYMENT", paymentDueAt: new Date("2026-10-31T23:59:00Z") }, now)).toBe(false);
  });

  it("holds paid and in-progress bookings, not requests", () => {
    expect(isBlocking({ ...base, status: "CONFIRMED" }, now)).toBe(true);
    expect(isBlocking({ ...base, status: "IN_PROGRESS" }, now)).toBe(true);
    expect(isBlocking({ ...base, status: "REQUESTED" }, now)).toBe(false);
    expect(isBlocking({ ...base, status: "COMPLETED" }, now)).toBe(false);
  });
});
