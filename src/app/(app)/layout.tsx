import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { CompanyStatusBadge, Logo } from "@/components/ui";
import { ROLES } from "@/lib/constants";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const links = user.company
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/vehicles", label: "My fleet" },
        { href: "/find", label: "Find a vehicle" },
        { href: "/bookings", label: "Bookings" },
        { href: "/team", label: "Team" },
      ]
    : [];
  if (user.isAdmin) links.push({ href: "/admin", label: "Verification queue" });

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link href={user.company ? "/dashboard" : "/admin"}>
            <Logo />
          </Link>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <div className="hidden text-right sm:block">
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-stone-500">
                {user.company ? `${user.company.name} · ${ROLES[user.role as keyof typeof ROLES]}` : "Downtime staff"}
              </p>
            </div>
            <form action={logout}>
              <button className="btn-secondary px-3 py-1.5">Log out</button>
            </form>
          </div>
        </div>
      </header>

      {user.company && user.company.status !== "VERIFIED" && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm text-amber-900 sm:px-6">
            <CompanyStatusBadge status={user.company.status} />
            {user.company.status === "PENDING"
              ? "You can set up your fleet now. Your vehicles go live and you can book once we verify your company."
              : "Your company was not verified. Contact Downtime support."}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
