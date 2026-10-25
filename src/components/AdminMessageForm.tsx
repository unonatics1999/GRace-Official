"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendAdminMessage } from "@/app/actions/admin-messages";
import type { ActionState } from "@/lib/util";

type Recipient = { email: string; name: string; phone: string };
type Channel = "EMAIL" | "SMS" | "BOTH";

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "Text message" },
  { value: "BOTH", label: "Both" },
];

// "GRace: " is added in front of every text message.
const SMS_PREFIX = 7;

export function AdminMessageForm({ recipients, initialTo = "" }: { recipients: Recipient[]; initialTo?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(sendAdminMessage, undefined);
  const [to, setTo] = useState(initialTo);
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [body, setBody] = useState("");
  const picked = recipients.find((r) => r.email === to.trim().toLowerCase());
  const smsLength = body.length + SMS_PREFIX;

  return (
    <form action={action} className="card space-y-4">
      <input type="hidden" name="channel" value={channel} />
      <label className="block">
        <span className="label">To</span>
        <input name="to" list="recipients" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Type a name or email" className="input" required />
        <datalist id="recipients">
          {recipients.map((r) => (
            <option key={r.email} value={r.email}>
              {r.phone ? `${r.name} · ${r.phone}` : r.name}
            </option>
          ))}
        </datalist>
        {picked && (
          <span className="mt-1 block text-xs text-stone-500">
            {picked.name} · {picked.email} · {picked.phone || "no mobile number"}
          </span>
        )}
      </label>

      <fieldset>
        <legend className="label">Send by</legend>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 text-sm">
          {CHANNELS.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={channel === c.value}
              onClick={() => setChannel(c.value)}
              className={`rounded-lg py-2 font-medium transition ${channel === c.value ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      {channel !== "SMS" && (
        <label className="block">
          <span className="label">Email subject</span>
          <input name="subject" maxLength={150} className="input" placeholder="e.g. Your booking on 2 November" />
        </label>
      )}

      <label className="block">
        <span className="label">Message</span>
        <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={2000} required className="input" />
        {channel !== "EMAIL" && (
          <span className={`mt-1 block text-xs ${smsLength > 160 ? "text-amber-700" : "text-stone-500"}`}>
            {smsLength}/160 characters for one text message
            {smsLength > 160 && ` · sends as ${Math.ceil(smsLength / 153)} parts`}
          </span>
        )}
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
      {pending ? "Sending…" : "Send message"}
    </button>
  );
}
