"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signup } from "@/app/actions/auth";
import type { ActionState } from "@/lib/util";

type AccountType = "RENTER" | "OWNER";
type Kind = "INDIVIDUAL" | "BUSINESS";

export function SignupForm({ initial = "RENTER" }: { initial?: AccountType }) {
  const [state, action] = useActionState<ActionState, FormData>(signup, undefined);
  const [accountType, setAccountType] = useState<AccountType>(initial);
  const [kind, setKind] = useState<Kind>("INDIVIDUAL");

  return (
    <form action={action} className="mt-6 space-y-5">
      <input type="hidden" name="accountType" value={accountType} />
      <input type="hidden" name="kind" value={kind} />

      <fieldset>
        <legend className="label">I want to</legend>
        <div className="grid grid-cols-2 gap-2">
          <Choice active={accountType === "RENTER"} onClick={() => setAccountType("RENTER")} title="Rent a car" hint="With a driver, or drive yourself" />
          <Choice active={accountType === "OWNER"} onClick={() => setAccountType("OWNER")} title="List my car" hint="Earn on the days you don't use it" />
        </div>
      </fieldset>

      <div className="flex gap-4 text-sm">
        {(["INDIVIDUAL", "BUSINESS"] as const).map((k) => (
          <label key={k} className="flex cursor-pointer items-center gap-2">
            <input type="radio" checked={kind === k} onChange={() => setKind(k)} className="accent-[#ff6a00]" />
            {k === "INDIVIDUAL" ? "As a person" : "As a business"}
          </label>
        ))}
      </div>

      {kind === "BUSINESS" && <Input label="Registered business name" name="companyName" autoComplete="organization" required />}
      <Input label="Full name" name="name" autoComplete="name" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="City" name="city" placeholder="e.g. Quezon City" required />
        <Input
          label={accountType === "RENTER" ? "Mobile number" : "Mobile number (optional)"}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0917 123 4567"
        />
      </div>
      <Input label="Email" name="email" type="email" autoComplete="email" required />
      <Input label="Password (10+ characters)" name="password" type="password" autoComplete="new-password" minLength={10} required />

      <label className="flex items-start gap-2 text-sm text-stone-600">
        <input type="checkbox" name="terms" className="mt-1 accent-[#ff6a00]" required />
        <span>
          I agree to the <Link href="/terms" className="font-medium text-brand-600 underline" target="_blank">Terms</Link> and{" "}
          <Link href="/privacy" className="font-medium text-brand-600 underline" target="_blank">Privacy Policy</Link>.
        </span>
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Submit label={accountType === "OWNER" ? "Create account and list my car" : "Create account"} />
      <p className="text-xs text-stone-500">
        {accountType === "RENTER"
          ? "Booking with a driver needs only your mobile number. An ID is needed only for self-drive."
          : "Next you'll add your car's details, photos and papers. GRace reviews every listing before it goes live."}
      </p>
    </form>
  );
}

function Choice({ active, onClick, title, hint }: { active: boolean; onClick: () => void; title: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border p-3 text-left transition ${active ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-stone-300 hover:border-stone-400"}`}
    >
      <span className="block text-sm font-semibold text-stone-900">{title}</span>
      <span className="mt-0.5 block text-xs text-stone-500">{hint}</span>
    </button>
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

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
      {pending ? "Creating account…" : label}
    </button>
  );
}
