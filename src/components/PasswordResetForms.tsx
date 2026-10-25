"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { requestPasswordReset, resetPassword, type ResetRequestState } from "@/app/actions/password-reset";
import type { ActionState } from "@/lib/util";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<ResetRequestState, FormData>(requestPasswordReset, undefined);
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");

  if (state?.ok) {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{state.ok}</p>
        {state.devLink && (
          <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
            Development only (no email/SMS provider set):{" "}
            <Link href={state.devLink.replace(/^https?:\/\/[^/]+/, "")} className="break-all font-medium underline">
              open the reset link
            </Link>
          </p>
        )}
        <Link href="/login" className="block text-sm font-medium text-brand-600">← Back to log in</Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="channel" value={channel} />
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" autoComplete="email" required className="input" />
      </label>
      <fieldset>
        <legend className="label">Send the link by</legend>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 text-sm">
          {(["EMAIL", "SMS"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={channel === c}
              onClick={() => setChannel(c)}
              className={`rounded-lg py-2 font-medium transition ${channel === c ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
            >
              {c === "EMAIL" ? "Email" : "Text message"}
            </button>
          ))}
        </div>
        {channel === "SMS" && <p className="mt-1 text-xs text-stone-500">Sent to the mobile number on your account.</p>}
      </fieldset>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Submit label="Send reset link" pending="Sending…" />
      <Link href="/login" className="block text-sm font-medium text-brand-600">← Back to log in</Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<ActionState, FormData>(resetPassword, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="label">New password (10+ characters)</span>
        <input name="password" type="password" autoComplete="new-password" minLength={10} required className="input" />
      </label>
      <label className="block">
        <span className="label">Confirm new password</span>
        <input name="confirm" type="password" autoComplete="new-password" minLength={10} required className="input" />
      </label>
      {state?.error && (
        <p className="text-sm text-red-600">
          {state.error}{" "}
          {state.error.includes("expired") && <Link href="/forgot-password" className="font-medium underline">Request a new link</Link>}
        </p>
      )}
      <Submit label="Save new password" pending="Saving…" />
    </form>
  );
}

function Submit({ label, pending: busy }: { label: string; pending: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
      {pending ? busy : label}
    </button>
  );
}
