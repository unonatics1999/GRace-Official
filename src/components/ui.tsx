import type { InputHTMLAttributes, ReactNode } from "react";
import { BOOKING_STATUS, COMPANY_STATUS } from "@/lib/constants";

export function Field({ label, ...input }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" {...input} />
    </label>
  );
}

/** The G+Race mark: a G whose crossbar runs out as a racing line. Same artwork as public/brand/grace-mark.svg. */
export function GraceMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#1f5139" />
      <path d="M7 25.5h7M5 32h8M7 38.5h7" stroke="#c6f135" strokeWidth="2.6" strokeLinecap="round" opacity="0.55" />
      <path d="M45.3 20.2 A16.5 16.5 0 1 0 50.6 34 H37.5" fill="none" stroke="#c6f135" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50.6 34 L58 34" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="2.2 3.2" />
    </svg>
  );
}

/** Brand lockup: the G mark + "Race" (the logo), then "Car Rentals" as a plain word. */
export function Logo({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} aria-label="GRace Car Rentals">
      <GraceMark className="h-8 w-8 shrink-0" />
      <span className={`text-[1.35em] font-extrabold italic leading-none tracking-tight ${dark ? "text-white" : "text-brand-900"}`}>
        Race
      </span>
      <span className={`ml-1.5 hidden text-[0.62em] font-semibold uppercase tracking-[0.22em] sm:inline ${dark ? "text-brand-100" : "text-brand-700"}`}>
        Car Rentals
      </span>
    </span>
  );
}

const companyTone: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  VERIFIED: "bg-brand-100 text-brand-700",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-stone-200 text-stone-700",
};

export function CompanyStatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${companyTone[status] ?? ""}`}>
      {COMPANY_STATUS[status as keyof typeof COMPANY_STATUS] ?? status}
    </span>
  );
}

const bookingTone: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-brand-100 text-brand-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELLED: "bg-stone-100 text-stone-600",
};

export function BookingStatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${bookingTone[status] ?? ""}`}>
      {BOOKING_STATUS[status as keyof typeof BOOKING_STATUS] ?? status}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}
