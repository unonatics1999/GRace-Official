import Link from "next/link";
import type { ReactNode } from "react";

export function AdminHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/** Status filter tabs that set ?status= on the current admin page. */
export function FilterTabs({ base, current, options }: { base: string; current?: string; options: { value?: string; label: string; count?: number }[] }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-stone-200">
      {options.map((o) => {
        const active = (o.value ?? "") === (current ?? "");
        return (
          <Link
            key={o.label}
            href={o.value ? `${base}?status=${o.value}` : base}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              active ? "border-brand-700 font-medium text-brand-700" : "border-transparent text-stone-500 hover:text-stone-900"
            }`}
          >
            {o.label}
            {o.count !== undefined && <span className="ml-1.5 text-xs text-stone-400">{o.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {empty ? (
            <tr>
              <td colSpan={head.length} className="px-4 py-10 text-center text-stone-500">Nothing here.</td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}

export function ActionButton({ action, label, tone = "secondary" }: { action: () => Promise<void>; label: string; tone?: "primary" | "secondary" | "danger" }) {
  return (
    <form action={action}>
      <button className={`btn-${tone} px-2.5 py-1 text-xs`}>{label}</button>
    </form>
  );
}
