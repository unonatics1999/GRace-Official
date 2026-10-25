import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("accepts the common ways people type a PH mobile number", () => {
    for (const input of ["09171234567", "0917 123 4567", "0917-123-4567", "+639171234567", "+63 917 123 4567", "639171234567"]) {
      expect(normalizePhone(input)).toBe("09171234567");
    }
  });

  it("accepts a Metro Manila landline", () => {
    expect(normalizePhone("02 8888 1234")).toBe("0288881234");
  });

  it("rejects numbers that aren't Philippine", () => {
    for (const input of ["", "12345", "0917123456", "+1 415 555 0100", "abc"]) {
      expect(normalizePhone(input)).toBeNull();
    }
  });
});
