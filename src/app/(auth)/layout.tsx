import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { currentUser, homeFor } from "@/lib/session";

const POINTS = [
  "Every owner and driver verified by GRace",
  "One clear price, paid securely through PayMongo",
  "Timestamped photos at every pick-up and return",
];

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (user) redirect(homeFor(user));

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" aria-label="GRace home" className="self-start">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</div>
        <p className="text-center text-xs text-stone-400">
          © {new Date().getFullYear()} GRace Car Rental ·{" "}
          <Link href="/terms" className="hover:text-stone-600">Terms</Link> ·{" "}
          <Link href="/privacy" className="hover:text-stone-600">Privacy</Link> ·{" "}
          <Link href="/help" className="hover:text-stone-600">Help</Link>
        </p>
      </div>

      <div className="relative hidden flex-col justify-between bg-[#0b0b0b] p-14 text-white lg:flex">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">GRace Car Rental</p>
        <div className="max-w-md">
          <p className="text-4xl font-semibold leading-tight tracking-tight">
            Life&apos;s a race.
            <br />
            <span className="text-lime">Ride it with GRace.</span>
          </p>
          <p className="mt-5 text-lg leading-relaxed text-stone-400">
            Rent a car from a verified owner, or book the owner as your professional driver.
          </p>
          <ul className="mt-10 space-y-4">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-stone-300">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lime/15 text-xs text-lime">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-stone-500">Mabilis ang buhay, panatag sa GRace.</p>
      </div>
    </div>
  );
}
