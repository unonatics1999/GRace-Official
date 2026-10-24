import Link from "next/link";
import { Logo } from "@/components/ui";
import { currentUser } from "@/lib/session";

const pairings = [
  { host: "Landscaper", idle: "idle Nov–Feb", renter: "Snow-removal crew", vehicle: "Pickup" },
  { host: "Caterer", idle: "idle Mon–Wed", renter: "Florist", vehicle: "Cargo van" },
  { host: "School-bus contractor", idle: "idle all summer", renter: "Summer camp", vehicle: "Passenger van" },
  { host: "Construction firm", idle: "between projects", renter: "Another contractor", vehicle: "Box truck" },
];

const steps = [
  { title: "Mark your downtime", body: "Tell us when each vehicle sits parked — every Monday to Wednesday, or all winter." },
  { title: "Verified businesses book", body: "Only vetted companies can request. You approve every booking." },
  { title: "Get paid for parking", body: "Keep 85% of every booking for days your vehicle would have sat idle." },
];

export default async function Home() {
  const user = await currentUser();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo className="text-lg" />
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href={user.isAdmin ? "/admin" : "/dashboard"} className="btn-primary">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">Log in</Link>
              <Link href="/signup" className="btn-primary">Get started</Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
        <p className="badge bg-brand-100 text-brand-700">Business-to-business only</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-6xl">
          Your parked vans are costing you money.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-stone-600">
          Downtime rents your idle vans, trucks and pickups to other verified businesses — only on the days you
          don&apos;t need them. One business&apos;s downtime is another business&apos;s peak.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">Earn from idle days</Link>
          <Link href="/signup" className="btn-secondary px-6 py-3 text-base">I need a work vehicle</Link>
        </div>
      </section>

      <section className="bg-brand-900 py-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
          {steps.map((step, i) => (
            <div key={step.title}>
              <p className="font-mono text-sm text-lime">0{i + 1}</p>
              <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-brand-100">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Counter-seasonal matches</h2>
        <p className="mt-2 text-stone-600">Businesses busy at opposite times share the same vehicle.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {pairings.map((p) => (
            <div key={p.host} className="card flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{p.host}</p>
                <p className="text-sm text-stone-500">{p.idle}</p>
              </div>
              <span className="text-xs text-stone-400">{p.vehicle} →</span>
              <p className="text-right font-medium">{p.renter}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-500">
        Downtime MVP
      </footer>
    </div>
  );
}
