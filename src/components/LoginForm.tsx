"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "@/app/actions/auth";
import type { ActionState } from "@/lib/util";

type Portal = "RENTER" | "OWNER" | "ADMIN";

const PORTALS: { value: Portal; label: string; title: string; hint: string }[] = [
  { value: "RENTER", label: "Renter", title: "Log in to rent a car", hint: "Book a car, with or without a driver." },
  { value: "OWNER", label: "Car owner", title: "Log in to your cars", hint: "Manage your listings, bookings and earnings." },
];
const ADMIN = { value: "ADMIN" as const, label: "Admin", title: "Staff sign-in", hint: "GRace administrators only." };

/** Renter and car-owner tabs. The admin variant (no tabs) is only rendered on the unlinked staff page. */
export function LoginForm({ initial = "RENTER", admin = false }: { initial?: Portal; admin?: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(login, undefined);
  const [picked, setPortal] = useState<Portal>(initial);
  const portal: Portal = admin ? "ADMIN" : picked;
  const current = admin ? ADMIN : PORTALS.find((p) => p.value === portal)!;

  return (
    <div>
      {!admin && <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 text-sm">
        {PORTALS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="tab"
            aria-selected={portal === p.value}
            onClick={() => setPortal(p.value)}
            className={`rounded-lg py-2 font-medium transition ${portal === p.value ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
          >
            {p.label}
          </button>
        ))}
      </div>}

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{current.title}</h1>
      <p className="mt-1 text-sm text-stone-500">{current.hint}</p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="portal" value={portal} />
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" autoComplete="email" required className="input" />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input name="password" type="password" autoComplete="current-password" required className="input" />
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Submit label={portal === "ADMIN" ? "Sign in to admin" : "Log in"} />
      </form>

      {portal !== "ADMIN" && (
        <p className="mt-6 text-sm text-stone-500">
          New to GRace?{" "}
          <Link href={`/signup${portal === "OWNER" ? "?as=owner" : ""}`} className="font-medium text-brand-600">
            {portal === "OWNER" ? "List your car" : "Create an account"}
          </Link>
        </p>
      )}
    </div>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
      {pending ? "Signing in…" : label}
    </button>
  );
}
