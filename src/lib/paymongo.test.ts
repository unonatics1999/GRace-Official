import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature, webhookFresh } from "./paymongo";

const secret = "whsk_test_secret";
const body = '{"data":{"attributes":{"type":"checkout_session.payment.paid","livemode":false}}}';
const sign = (t: string, b: string) => createHmac("sha256", secret).update(`${t}.${b}`).digest("hex");

describe("verifyWebhookSignature", () => {
  it("accepts a valid test-mode signature", () => {
    const header = `t=1496734173,te=${sign("1496734173", body)},li=`;
    expect(verifyWebhookSignature(body, header, secret, false)).toBe(true);
  });

  it("checks li in live mode, not te", () => {
    const header = `t=1496734173,te=${sign("1496734173", body)},li=`;
    expect(verifyWebhookSignature(body, header, secret, true)).toBe(false);
    const live = `t=1496734173,te=,li=${sign("1496734173", body)}`;
    expect(verifyWebhookSignature(body, live, secret, true)).toBe(true);
  });

  it("rejects a tampered body, a wrong secret and a missing header", () => {
    const header = `t=1,te=${sign("1", body)},li=`;
    expect(verifyWebhookSignature(body.replace("false", "true"), header, secret, false)).toBe(false);
    expect(verifyWebhookSignature(body, header, "other", false)).toBe(false);
    expect(verifyWebhookSignature(body, null, secret, false)).toBe(false);
  });
});

describe("webhookFresh", () => {
  const now = 1_800_000_000;
  it("accepts a recent timestamp", () => {
    expect(webhookFresh(`t=${now - 60},te=abc`, now)).toBe(true);
  });
  it("refuses a replayed old event", () => {
    expect(webhookFresh(`t=${now - 3600},te=abc`, now)).toBe(false);
  });
  it("refuses a missing timestamp", () => {
    expect(webhookFresh("te=abc", now)).toBe(false);
    expect(webhookFresh(null, now)).toBe(false);
  });
});
