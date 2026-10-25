"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signup } from "@/app/actions/auth";
import type { ActionState } from "@/lib/util";

export function SignupForm() {
  const [state, action] = useActionState<ActionState, FormData>(signup, undefined);
  const [kind, setKind] = useState<"INDIVIDUAL" | "BUSINESS">("INDIVIDUAL");

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["INDIVIDUAL", "Personal", "Rent with a driver, drive yourself, or list your car"],
            ["BUSINESS", "Business", "Company account with invoicing and a team"],
          ] as const
        ).map(([value, label, hint]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`rounded-xl border p-3 text-left transition ${
              kind === value ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-stone-300 hover:border-stone-400"
            }`}
          >
            <span className="block text-sm font-semibold text-stone-900">{label}</span>
            <span className="mt-0.5 block text-xs text-stone-500">{hint}</span>
          </button>
        ))}
      </div>

      {kind === "BUSINESS" && <Input label="Registered business name" name="companyName" autoComplete="organization" required />}
      <Input label="Full name" name="name" autoComplete="name" required />
      <Input label="City" name="city" placeholder="e.g. Quezon City" required />
      <Input label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0917 123 4567" />
      <Input label="Email" name="email" type="email" autoComplete="email" required />
      <Input label="Password" name="password" type="password" autoComplete="new-password" minLength={10} required />

      <label className="flex items-start gap-2 text-sm text-stone-600">
        <input type="checkbox" name="terms" className="mt-1 accent-[#1f5139]" required />
        <span>
          I agree to the <Link href="/terms" className="font-medium text-brand-600 underline" target="_blank">Terms</Link> and{" "}
          <Link href="/privacy" className="font-medium text-brand-600 underline" target="_blank">Privacy Policy</Link>, including
          identity checks under the Data Privacy Act of 2012.
        </span>
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Submit />
    </form>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" {...props} />
    </label>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}
