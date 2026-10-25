import { describe, expect, it } from "vitest";
import { hashResetToken, newResetToken, resetUsable } from "./password-reset";

describe("password reset tokens", () => {
  it("stores only a hash that matches the token", () => {
    const { token, tokenHash } = newResetToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenHash).not.toContain(token);
    expect(hashResetToken(token)).toBe(tokenHash);
  });

  it("makes a different token every time", () => {
    expect(newResetToken().token).not.toBe(newResetToken().token);
  });

  it("is usable once, before it expires", () => {
    const now = new Date("2026-10-26T10:00:00Z");
    const later = new Date("2026-10-26T10:30:00Z");
    expect(resetUsable({ expiresAt: later, usedAt: null }, now)).toBe(true);
    expect(resetUsable({ expiresAt: later, usedAt: now }, now)).toBe(false);
    expect(resetUsable({ expiresAt: now, usedAt: null }, now)).toBe(false);
    expect(resetUsable(null, now)).toBe(false);
  });
});
