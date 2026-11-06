import { describe, expect, it } from "vitest";
import { ipFromHeaders } from "./client-ip";

const h = (values: Record<string, string>) => new Headers(values);

describe("ipFromHeaders", () => {
  it("ignores the client-supplied first X-Forwarded-For entry", () => {
    expect(ipFromHeaders(h({ "x-forwarded-for": "6.6.6.6, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("prefers X-Real-IP set by the proxy", () => {
    expect(ipFromHeaders(h({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "6.6.6.6" }))).toBe("203.0.113.9");
  });

  it("falls back to one shared bucket without proxy headers", () => {
    expect(ipFromHeaders(h({}))).toBe("unknown");
  });
});
