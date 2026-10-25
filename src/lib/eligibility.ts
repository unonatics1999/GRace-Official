// Who may book what. Every booking needs a mobile number to coordinate pick-up; with a driver, that
// is all (no ID). Self-drive also needs a verified account (ID checked) and a driver's licence valid
// through the return date. Used by the listing page and enforced again on the server.

export type RenterAccount = {
  status: string;
  phone: string;
  licenceNo: string;
  licenceExpiry: Date | null;
};

export type Eligibility = { ok: true } | { ok: false; reason: string };

export function bookingEligibility(
  account: RenterAccount,
  mode: "SELF_DRIVE" | "WITH_DRIVER",
  returnDay: Date,
): Eligibility {
  if (account.status === "SUSPENDED") return { ok: false, reason: "Your account is suspended. Contact GRace support." };
  if (account.status === "REJECTED") return { ok: false, reason: "Your account was not approved. Contact GRace support." };

  if (!account.phone) return { ok: false, reason: "Add a mobile number so the owner can reach you." };
  if (mode === "WITH_DRIVER") return { ok: true };

  if (account.status !== "VERIFIED") {
    return { ok: false, reason: "Self-drive needs a verified ID. Upload it on your account, or book with a driver (no ID needed)." };
  }
  if (!account.licenceNo || !account.licenceExpiry) {
    return { ok: false, reason: "Self-drive needs a valid driver's licence on your account." };
  }
  if (account.licenceExpiry < returnDay) {
    return { ok: false, reason: "Your driver's licence expires before the return date." };
  }
  return { ok: true };
}
