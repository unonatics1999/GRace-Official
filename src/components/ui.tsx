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

/** The GRace logo (the owner's artwork). */
export function GraceMark({ className = "h-10 w-10" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static brand image
  return <img src="/brand/grace-logo.png" alt="" aria-hidden="true" className={className} />;
}

/** Brand logo for headers. */
export function Logo({ className = "" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <span className={`inline-flex leading-none ${className}`} aria-label="GRace Car Rentals">
      <GraceMark className="h-14 w-14" />
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
