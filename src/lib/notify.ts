import { db } from "./db";
import { env, isLocalDevelopment } from "./env";

// Sends email (Resend) and SMS (Semaphore) and records every attempt in the Message table.
// Without a provider key, development simulates the send: it's logged and recorded as SIMULATED.
// Production refuses to simulate, so a missing key shows up as FAILED instead of silently "sent".

export type Channel = "EMAIL" | "SMS";
export type SendResult = { status: "SENT" | "FAILED" | "SIMULATED"; error: string };

type Outgoing = {
  toUserId: string;
  sentById?: string | null;
  channel: Channel;
  address: string;
  subject?: string;
  body: string;
  /** What to keep in the message log instead of the body (for messages carrying a secret link). */
  storedBody?: string;
  kind?: "ADMIN" | "PASSWORD_RESET";
};

export function emailConfigured(): boolean {
  return Boolean(env().RESEND_API_KEY);
}

export function smsConfigured(): boolean {
  return Boolean(env().SEMAPHORE_API_KEY);
}

async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  const e = env();
  if (!e.RESEND_API_KEY) return simulated("EMAIL", to, `${subject}\n${text}`);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: e.EMAIL_FROM, to: [to], subject, text }),
  });
  return res.ok ? { status: "SENT", error: "" } : { status: "FAILED", error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
}

async function sendSms(to: string, text: string): Promise<SendResult> {
  const e = env();
  if (!e.SEMAPHORE_API_KEY) return simulated("SMS", to, text);
  const form = new URLSearchParams({ apikey: e.SEMAPHORE_API_KEY, number: to, message: text });
  if (e.SMS_SENDER_NAME) form.set("sendername", e.SMS_SENDER_NAME);
  const res = await fetch("https://api.semaphore.co/api/v4/messages", { method: "POST", body: form });
  return res.ok ? { status: "SENT", error: "" } : { status: "FAILED", error: `Semaphore ${res.status}: ${(await res.text()).slice(0, 300)}` };
}

function simulated(channel: Channel, to: string, text: string): SendResult {
  if (!isLocalDevelopment()) {
    return { status: "FAILED", error: `${channel === "EMAIL" ? "RESEND_API_KEY" : "SEMAPHORE_API_KEY"} is not set.` };
  }
  console.log(`\n[simulated ${channel.toLowerCase()} to ${to}]\n${text}\n`);
  return { status: "SIMULATED", error: "" };
}

/** Sends one message and records the result. Never throws: network errors become FAILED. */
export async function sendMessage(m: Outgoing): Promise<SendResult> {
  let result: SendResult;
  try {
    result = m.channel === "EMAIL" ? await sendEmail(m.address, m.subject ?? "", m.body) : await sendSms(m.address, m.body);
  } catch (error) {
    result = { status: "FAILED", error: error instanceof Error ? error.message : String(error) };
  }
  await db.message.create({
    data: {
      toUserId: m.toUserId,
      sentById: m.sentById ?? null,
      channel: m.channel,
      address: m.address,
      subject: m.subject ?? "",
      body: m.storedBody ?? m.body,
      kind: m.kind ?? "ADMIN",
      status: result.status,
      error: result.error,
    },
  });
  return result;
}

/** Semaphore wants 09XXXXXXXXX or 639XXXXXXXXX; our stored form (09…) works as is. SMS needs a mobile. */
export function isMobile(phone: string): boolean {
  return /^09\d{9}$/.test(phone);
}
