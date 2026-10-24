"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** A nav link that highlights itself when its section is open. */
export function NavLink({ href, children, variant = "top" }: { href: string; children: ReactNode; variant?: "top" | "side" }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const base =
    variant === "side"
      ? "flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
      : "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${base} ${active ? "bg-brand-50 font-medium text-brand-700" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"}`}
    >
      {children}
    </Link>
  );
}
