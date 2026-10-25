/**
 * Normalises a Philippine phone number to its local form, e.g. "0917 123 4567", "+63 917-123-4567"
 * and "639171234567" all become "09171234567". Returns null if it isn't a PH number.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+63")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("63") && digits.length === 12) digits = `0${digits.slice(2)}`;
  // Mobile: 09XXXXXXXXX. Landline: area code + number, 10 or 11 digits with the leading 0.
  return /^09\d{9}$/.test(digits) || /^0[2-8]\d{8,9}$/.test(digits) ? digits : null;
}

export const PHONE_HINT = "Enter a PH mobile number, e.g. 0917 123 4567.";
