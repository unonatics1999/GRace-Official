// PayMongo hosted checkout. Docs: https://docs.paymongo.com/reference/create-a-checkout
// and webhook signing: https://docs.paymongo.com/docs/developer-tools-webhook-setup-management

import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.paymongo.com/v1";

/** GCash, Maya and cards cover most Philippine business payers. */
export const PAYMENT_METHODS = ["gcash", "paymaya", "card", "qrph"] as const;

export type CheckoutInput = {
  secretKey: string;
  amountCents: number;
  name: string;
  description: string;
  referenceNumber: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};

export type CheckoutSession = { id: string; checkoutUrl: string };

export async function createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession> {
  const res = await fetch(`${API}/checkout_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${input.secretKey}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [{ amount: input.amountCents, currency: "PHP", name: input.name, quantity: 1 }],
          payment_method_types: PAYMENT_METHODS,
          description: input.description,
          reference_number: input.referenceNumber,
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          send_email_receipt: true,
          metadata: input.metadata,
        },
      },
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`PayMongo checkout failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { data: { id: string; attributes: { checkout_url: string } } };
  return { id: json.data.id, checkoutUrl: json.data.attributes.checkout_url };
}

/**
 * Verifies the Paymongo-Signature header ("t=…,te=…,li=…"): HMAC-SHA256 of "<t>.<raw body>"
 * with the webhook secret, compared with te (test mode) or li (live mode).
 */
export function verifyWebhookSignature(rawBody: string, header: string | null, secret: string, livemode: boolean): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const i = part.indexOf("=");
      return [part.slice(0, i).trim(), part.slice(i + 1).trim()];
    }),
  );
  const timestamp = parts.t;
  const provided = livemode ? parts.li : parts.te;
  if (!timestamp || !provided) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when the signature's timestamp (seconds) is within `toleranceSec` of now. */
export function webhookFresh(header: string | null, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300): boolean {
  const t = Number(/(?:^|,)\s*t=(\d+)/.exec(header ?? "")?.[1]);
  return Number.isFinite(t) && t > 0 && Math.abs(nowSec - t) <= toleranceSec;
}

export type WebhookEvent = {
  data: {
    attributes: {
      type: string;
      livemode: boolean;
      data: { id: string; attributes: { reference_number?: string } };
    };
  };
};
