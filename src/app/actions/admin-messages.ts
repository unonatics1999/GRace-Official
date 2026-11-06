"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isMobile, sendMessage, type SendResult } from "@/lib/notify";
import { requireAdmin } from "@/lib/session";
import { firstError, normalizeEmail, type ActionState, formFields } from "@/lib/util";

const schema = z.object({
  to: z.string().trim().min(1, "Choose who to message."),
  channel: z.enum(["EMAIL", "SMS", "BOTH"], { message: "Choose email, text message or both." }),
  subject: z.string().trim().max(150).default(""),
  body: z.string().trim().min(2, "Write your message.").max(2000, "Keep the message under 2,000 characters."),
});

function label(r: SendResult): string {
  if (r.status === "SENT") return "sent";
  if (r.status === "SIMULATED") return "simulated (no provider set)";
  return `failed: ${r.error}`;
}

/** Admin to user message by email, SMS or both. Every send is recorded and audited. */
export async function sendAdminMessage(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = schema.safeParse(formFields(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { channel, subject, body } = parsed.data;

  const user = await db.user.findUnique({ where: { email: normalizeEmail(parsed.data.to) }, include: { company: true } });
  if (!user) return { error: "No user with that email." };
  const phone = user.company?.phone ?? "";
  const wantsEmail = channel !== "SMS";
  const wantsSms = channel !== "EMAIL";
  if (wantsEmail && !subject) return { error: "Add a subject for the email." };
  if (wantsSms && !isMobile(phone)) return { error: `${user.name} has no mobile number on file. Send by email instead.` };

  const results: string[] = [];
  if (wantsEmail) {
    const r = await sendMessage({ toUserId: user.id, sentById: admin.id, channel: "EMAIL", address: user.email, subject, body: `${body}\n\nGRace Car Rental` });
    results.push(`Email ${label(r)}`);
  }
  if (wantsSms) {
    const r = await sendMessage({ toUserId: user.id, sentById: admin.id, channel: "SMS", address: phone, body: `GRace: ${body}` });
    results.push(`Text message ${label(r)}`);
  }

  await audit(admin.id, "admin.message_sent", "User", user.id, `${channel}: ${subject || body.slice(0, 60)}`);
  revalidatePath("/admin/messages");
  const summary = results.join(" · ");
  return summary.includes("failed") ? { error: summary } : { ok: `${summary} to ${user.name}.` };
}
