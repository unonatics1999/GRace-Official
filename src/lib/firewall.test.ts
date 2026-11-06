import { describe, expect, it } from "vitest";
import { MAX_FORM_BYTES, inspectRequest } from "./firewall";

const req = (over: Partial<Parameters<typeof inspectRequest>[0]> = {}) =>
  inspectRequest({ method: "GET", pathname: "/explore", search: "", userAgent: "Mozilla/5.0", contentLength: null, ...over });

describe("inspectRequest", () => {
  it("lets ordinary visits through", () => {
    expect(req()).toBeNull();
    expect(req({ search: "?city=Quezon+City&type=MPV&from=2026-11-10" })).toBeNull();
    expect(req({ search: "?q=O%27Brien" })).toBeNull();
    expect(req({ pathname: "/listing/cmvnjxcpm000ew2rwwk2qhmna" })).toBeNull();
  });

  it("blocks SQL injection in the query string", () => {
    for (const s of ["?city=' OR '1'='1", "?id=1 UNION SELECT password FROM User", "?city=x'; DROP TABLE User;--", "?q=1 AND sleep(5)", "?q=%27%20OR%201%3D1"]) {
      expect(req({ search: s })?.status).toBe(400);
    }
  });

  it("blocks script injection and path traversal", () => {
    expect(req({ search: "?q=<script>alert(1)</script>" })?.status).toBe(400);
    expect(req({ search: "?q=%3Cscript%3E" })?.status).toBe(400);
    expect(req({ search: "?next=javascript:alert(1)" })?.status).toBe(400);
    expect(req({ pathname: "/api/files/document/..%2F..%2F.env" })?.status).toBe(404);
    expect(req({ search: "?f=../../etc/passwd" })?.status).toBe(400);
  });

  it("turns away scanners", () => {
    expect(req({ pathname: "/wp-admin/" })?.status).toBe(404);
    expect(req({ pathname: "/.env" })?.status).toBe(404);
    expect(req({ pathname: "/.git/config" })?.status).toBe(404);
    expect(req({ pathname: "/index.php" })?.status).toBe(404);
    expect(req({ userAgent: "sqlmap/1.7" })?.status).toBe(403);
  });

  it("limits body sizes, with room for photo uploads", () => {
    expect(req({ method: "POST", pathname: "/login", contentLength: MAX_FORM_BYTES + 1 })?.status).toBe(413);
    expect(req({ method: "POST", pathname: "/fleet/abc", contentLength: 10 * 1024 * 1024 })).toBeNull();
    expect(req({ method: "POST", pathname: "/fleet/abc", contentLength: 40 * 1024 * 1024 })?.status).toBe(413);
  });

  it("refuses absurdly long URLs", () => {
    expect(req({ search: `?q=${"a".repeat(3000)}` })?.status).toBe(414);
  });
});
