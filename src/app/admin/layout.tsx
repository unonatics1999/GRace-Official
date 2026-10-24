import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Admin · Downtime" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const pending = await db.company.count({ where: { status: "PENDING" } });

  const links = [
    { href: "/admin/overview", label: "Overview" },
    { href: "/admin/companies", label: "Companies", count: pending },
    { href: "/admin/vehicles", label: "Vehicles" },
    { href: "/admin/bookings", label: "Bookings" },
    { href: "/admin/users", label: "Users" },
  ];

  return (
    <div className="min-h-screen bg-stone-50 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-stone-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/admin/overview" className="flex items-center gap-2">
            <Logo />
            <span className="badge bg-stone-900 text-white">Admin</span>
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href} variant="side">
              <span className="flex-1 whitespace-nowrap">{l.label}</span>
              {l.count ? <span className="badge bg-amber-100 text-amber-800">{l.count}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-stone-100 p-4 text-sm lg:absolute lg:bottom-0 lg:block lg:w-full">
          <p className="font-medium">{admin.name}</p>
          <p className="truncate text-xs text-stone-500">{admin.email}</p>
          <div className="mt-3 flex gap-2">
            <Link href="/" className="btn-secondary flex-1 px-2 py-1.5 text-xs">View site</Link>
            <form action={logout} className="flex-1">
              <button className="btn-secondary w-full px-2 py-1.5 text-xs">Log out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
