import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyWebhookSignature, type WebhookEvent } from "@/lib/paymongo";
import { markPaymentPaid } from "@/lib/payments";

// PayMongo calls this when a checkout is paid. Register it in the PayMongo dashboard as
// <APP_URL>/api/webhooks/paymongo for the checkout_session.payment.paid event.

export async function POST(request: Request) {
  const secret = env().PAYMONGO_WEBHOOK_SECRET;
  if (!secret) return new NextResponse("Webhook not configured", { status: 503 });

  const raw = await request.text();
  let event: WebhookEvent;
  try {
    event = JSON.parse(raw) as WebhookEvent;
  } catch {
    return new NextResponse("Bad payload", { status: 400 });
  }

  const livemode = Boolean(event.data?.attributes?.livemode);
  if (!verifyWebhookSignature(raw, request.headers.get("paymongo-signature"), secret, livemode)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  if (event.data.attributes.type === "checkout_session.payment.paid") {
    const sessionId = event.data.attributes.data.id;
    const payment = await db.payment.findUnique({ where: { checkoutSessionId: sessionId } });
    // Unknown sessions are acknowledged so PayMongo stops retrying; there's nothing to do.
    if (payment) await markPaymentPaid(payment.id);
  }
  return NextResponse.json({ received: true });
}
