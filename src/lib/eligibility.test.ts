import { describe, expect, it } from "vitest";
import { bookingEligibility, type RenterAccount } from "./eligibility";
import { parseDay } from "./dates";

const d = (s: string) => parseDay(s)!;
const unverified: RenterAccount = { status: "PENDING", phone: "09171234567", licenceNo: "", licenceExpiry: null };
const verified: RenterAccount = { status: "VERIFIED", phone: "09171234567", licenceNo: "N01-23-456789", licenceExpiry: d("2027-06-01") };

describe("bookingEligibility", () => {
  it("lets an unverified account with no ID book with a driver", () => {
    expect(bookingEligibility(unverified, "WITH_DRIVER", d("2026-11-02")).ok).toBe(true);
  });

  it("needs a phone number for a with-driver booking", () => {
    expect(bookingEligibility({ ...unverified, phone: "" }, "WITH_DRIVER", d("2026-11-02")).ok).toBe(false);
  });

  it("refuses self-drive without a verified ID", () => {
    expect(bookingEligibility({ ...unverified, licenceNo: "N01-23-456789", licenceExpiry: d("2027-06-01") }, "SELF_DRIVE", d("2026-11-02")).ok).toBe(false);
  });

  it("refuses self-drive without a licence, or one expiring before return", () => {
    expect(bookingEligibility({ ...verified, licenceNo: "" }, "SELF_DRIVE", d("2026-11-02")).ok).toBe(false);
    expect(bookingEligibility(verified, "SELF_DRIVE", d("2027-06-02")).ok).toBe(false);
  });

  it("allows self-drive for a verified account with a valid licence", () => {
    expect(bookingEligibility(verified, "SELF_DRIVE", d("2027-06-01")).ok).toBe(true);
  });

  it("blocks suspended and rejected accounts in every mode", () => {
    for (const status of ["SUSPENDED", "REJECTED"]) {
      expect(bookingEligibility({ ...verified, status }, "WITH_DRIVER", d("2026-11-02")).ok).toBe(false);
      expect(bookingEligibility({ ...verified, status }, "SELF_DRIVE", d("2026-11-02")).ok).toBe(false);
    }
  });
});
