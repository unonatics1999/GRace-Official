import Link from "next/link";
import { logout } from "@/app/actions/auth";

export const metadata = { title: "Account suspended · GRace Car Rental", robots: { index: false, follow: false } };

export default function SuspendedPage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Account suspended</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your account is on hold</h1>
      <p className="mt-4 text-stone-600">
        GRace has suspended this account, so bookings, listings and payouts are paused. If you think this is a mistake, contact
        support through the Help center and we&apos;ll look into it.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/help" className="btn-primary">Help center</Link>
        <form action={logout}>
          <button className="btn-secondary">Log out</button>
        </form>
      </div>
    </section>
  );
}
