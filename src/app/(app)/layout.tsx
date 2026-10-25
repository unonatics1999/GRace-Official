import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { NavLink } from "@/components/NavLink";
import { CompanyStatusBadge, Logo } from "@/components/ui";
import { homeFor, requireUser } from "@/lib/session";

const RENTER_LINKS = [
  { href: "/explore", label: "Find a car" },
  { href: "/bookings", label: "My trips" },
  { href: "/account", label: "Account" },
];

const OWNER_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/fleet", label: "My cars" },
  { href: "/bookings", label: "Bookings" },
  { href: "/driver", label: "Driver" },
  { href: "/account", label: "Account" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Admins have no renter/owner account; their home is the admin console.
  if (!user.company) redirect("/admin");
  const owner = user.company.accountType === "OWNER";
  const links = owner ? OWNER_LINKS : RENTER_LINKS;
  const status = user.company.status;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href={homeFor(user)} aria-label="Home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href}>{l.label}</NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 sm:inline">
              {owner ? "Car owner" : "Renter"}
            </span>
            {owner ? (
              <Link href="/explore" className="btn-secondary hidden lg:inline-flex">Find a car</Link>
            ) : (
              <Link href="/become-owner" className="btn-secondary hidden lg:inline-flex">List your car</Link>
            )}
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-stone-300 bg-white py-1 pl-1 pr-3 hover:shadow-sm [&::-webkit-details-marker]:hidden">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-sm font-semibold text-lime">
                  {user.name[0]}
                </span>
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-stone-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 6h14M3 10h14M3 14h14" />
                </svg>
              </summary>
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                <div className="border-b border-stone-100 px-3 pb-3 pt-2">
                  <p className="font-medium">{user.name}</p>
                  <p className="truncate text-xs text-stone-500">{user.email}</p>
                </div>
                <div className="py-1 md:hidden">
                  {links.map((l) => (
                    <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100">{l.label}</Link>
                  ))}
                </div>
                {owner ? (
                  <MenuLink href="/explore">Find a car</MenuLink>
                ) : (
                  <MenuLink href="/become-owner">List your car</MenuLink>
                )}
                {user.company.kind === "BUSINESS" && <MenuLink href="/team">Team</MenuLink>}
                <MenuLink href="/settings">Email &amp; password</MenuLink>
                <MenuLink href="/help">Help center</MenuLink>
                <form action={logout} className="border-t border-stone-100 pt-1">
                  <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Log out</button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>

      {status !== "VERIFIED" && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5 text-sm text-amber-900 sm:px-6">
            <CompanyStatusBadge status={status} />
            {status === "PENDING" ? (
              owner ? (
                <>Verify your ID so Downtime can approve your car. <Link href="/account?verify=1" className="font-medium underline">Verify</Link></>
              ) : (
                <>You can book with a driver now, no ID needed. Verify your ID only if you want to drive yourself. <Link href="/account?verify=1" className="font-medium underline">Verify</Link></>
              )
            ) : status === "SUSPENDED" ? (
              "Your account is suspended: listings are hidden and booking is paused. Contact Downtime support."
            ) : (
              "We couldn't verify your account. Check your documents or contact Downtime support."
            )}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100">{children}</Link>;
}
