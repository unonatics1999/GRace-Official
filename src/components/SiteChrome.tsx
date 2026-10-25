import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/ui";
import { homeFor, type SessionUser } from "@/lib/session";

/** Header for public pages: marketplace links plus the visitor's account state. */
export function SiteHeader({ user }: { user: SessionUser | null }) {
  const home = user ? homeFor(user) : "/login";
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Downtime home">
          <Logo className="text-lg" />
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <Link href="/explore" className="rounded-lg px-3 py-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900">
            Explore vehicles
          </Link>
          <Link href="/signup?as=owner" className="rounded-lg px-3 py-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900">
            List your car
          </Link>
          <Link href="/#how" className="rounded-lg px-3 py-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900">
            How it works
          </Link>
          <Link href="/help" className="rounded-lg px-3 py-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900">
            Help
          </Link>
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link href={home} className="btn-primary">
                {user.isAdmin ? "Admin console" : user.company?.accountType === "OWNER" ? "My dashboard" : "My trips"}
              </Link>
              <form action={logout}>
                <button className="btn-secondary">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">Log in</Link>
              <Link href="/signup" className="btn-primary">Get started</Link>
            </>
          )}
        </div>

        <details className="group relative ml-auto md:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-stone-300 bg-white [&::-webkit-details-marker]:hidden">
            <span className="sr-only">Menu</span>
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 6h14M3 10h14M3 14h14" />
            </svg>
          </summary>
          <div className="absolute right-0 mt-2 w-60 space-y-1 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
            <Link href="/explore" className="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100">Explore vehicles</Link>
            <Link href="/signup?as=owner" className="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100">List your car</Link>
            <Link href="/#how" className="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100">How it works</Link>
            <Link href="/help" className="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100">Help center</Link>
            <div className="border-t border-stone-100 pt-2">
              {user ? (
                <Link href={home} className="btn-primary w-full">{user.isAdmin ? "Admin console" : user.company?.accountType === "OWNER" ? "My dashboard" : "My trips"}</Link>
              ) : (
                <div className="grid gap-2">
                  <Link href="/signup" className="btn-primary w-full">Get started</Link>
                  <Link href="/login" className="btn-secondary w-full">Log in</Link>
                </div>
              )}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-stone-500">
            Rent cars, with or without the owner as driver. Every owner and driver is verified.
          </p>
        </div>
        <FooterColumn
          title="Renters"
          links={[
            ["Explore vehicles", "/explore"],
            ["Create an account", "/signup"],
          ]}
        />
        <FooterColumn
          title="Owners"
          links={[
            ["Earnings calculator", "/#hosts"],
            ["List your car", "/signup"],
          ]}
        />
        <FooterColumn
          title="Downtime"
          links={[
            ["How it works", "/#how"],
            ["Help center", "/help"],
            ["Terms", "/terms"],
            ["Privacy", "/privacy"],
          ]}
        />
      </div>
      <div className="border-t border-stone-100 py-5 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} Downtime · MVP
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-stone-900">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-stone-500">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="hover:text-stone-900">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
