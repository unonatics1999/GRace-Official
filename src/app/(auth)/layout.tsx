import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { currentUser, homeFor } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (user) redirect(homeFor(user));

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Link href="/" aria-label="GRace home">
          <Logo className="text-lg" />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-brand-900 lg:block">
        <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 space-y-8 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
          <img src="/brand/grace-logo.png" alt="GRace Car Rentals" className="h-40 w-auto" />
          <div>
            <p className="text-3xl font-semibold tracking-tight">Rent a car, or the car and its driver.</p>
            <p className="mt-3 text-brand-100">
              Verified owners, pro-licensed drivers, and a photo record of every handoff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
