import Link from "next/link";
import { EarningsCalculator } from "@/components/EarningsCalculator";
import { ListingCard, VerifiedIcon } from "@/components/ListingCard";
import { SearchBar } from "@/components/SearchBar";
import { VehicleArt } from "@/components/VehicleArt";
import { db } from "@/lib/db";
import { LISTABLE } from "@/lib/listings";

const pairings = [
  { host: "Landscaper", hostIdle: "Idle Nov – Feb", renter: "Snow-removal crew", renterNeed: "Busy Nov – Feb", type: "PICKUP" },
  { host: "Caterer", hostIdle: "Idle Mon – Wed", renter: "Florist", renterNeed: "Busy weekdays", type: "CARGO_VAN" },
  { host: "School-bus contractor", hostIdle: "Idle all summer", renter: "Summer camp", renterNeed: "Busy Jun – Aug", type: "PASSENGER_VAN" },
  { host: "Construction firm", hostIdle: "Idle between projects", renter: "Moving company", renterNeed: "Busy month-end", type: "BOX_TRUCK" },
];

const hostSteps = [
  ["List a vehicle", "Add your van, truck or pickup with its equipment and a daily rate."],
  ["Mark its downtime", "Every Monday to Wednesday, or the whole off-season. It's only bookable then."],
  ["Approve and earn", "You approve every request from a verified business and keep 85%."],
];
const renterSteps = [
  ["Search by job", "Filter by vehicle type, city and the exact days you need."],
  ["Request a work-ready vehicle", "Racks, liftgates, plow mounts: equipment is listed on every vehicle."],
  ["Bill it to the company", "One account for your whole team. No retail counter, no consumer hosts."],
];

const comparison = [
  ["Who's on the other side", "Anyone with a car", "The rental company", "Verified businesses only"],
  ["Vehicles", "Personal cars", "Standard rental fleet", "Work vehicles with equipment"],
  ["When it's available", "Whenever the owner says", "Always, at retail prices", "The owner's real idle days"],
  ["Who pays", "A person's card", "A card or corporate account", "Your company account"],
];

const faqs = [
  [
    "Who can rent on Downtime?",
    "Only businesses we've verified. Every account belongs to a company, and every renter is checked before their first booking.",
  ],
  [
    "Will my vehicle be booked when I need it?",
    "No. A vehicle can only be booked on the days you mark as downtime, and you approve every request.",
  ],
  [
    "What does it cost?",
    "Listing is free. Downtime keeps 15% of the host's rate and charges renters a 10% service fee.",
  ],
  [
    "What about insurance and damage?",
    "Insurance cover per booking and a photo check-out and check-in for both sides are on our roadmap before public launch.",
  ],
];

export default async function Home() {
  const featured = await db.vehicle.findMany({
    where: LISTABLE,
    include: { company: true, windows: true },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 shadow-sm ring-1 ring-brand-100">
              <VerifiedIcon className="h-3.5 w-3.5 text-brand-600" /> Business-to-business only
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-stone-900 sm:text-6xl">
              Rent work vehicles from businesses that aren&apos;t using them.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-stone-600">
              Downtime connects companies with idle vans, trucks and pickups to companies that need one for a job — on
              exactly the days the owner doesn&apos;t.
            </p>
          </div>
          <div className="mt-10 max-w-5xl">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Available from verified businesses</h2>
              <p className="mt-1 text-stone-500">Listed by companies whose vehicles sit idle part of the week or year.</p>
            </div>
            <Link href="/explore" className="hidden text-sm font-medium text-brand-600 hover:underline sm:block">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((v) => (
              <ListingCard key={v.id} vehicle={v} />
            ))}
          </div>
        </section>
      )}

      {/* The idea */}
      <section className="bg-stone-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            One business&apos;s downtime is another business&apos;s peak.
          </h2>
          <p className="mt-2 max-w-2xl text-stone-600">
            Companies busy at opposite times of the week or year share the same vehicle — and both come out ahead.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {pairings.map((p) => (
              <div key={p.host} className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4">
                <VehicleArt type={p.type} seed={p.host} className="h-20 w-28 shrink-0 rounded-xl" />
                <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-stone-900">{p.host}</p>
                    <p className="text-brand-600">{p.hostIdle}</p>
                  </div>
                  <div className="border-l border-stone-200 pl-3">
                    <p className="font-semibold text-stone-900">{p.renter}</p>
                    <p className="text-stone-500">{p.renterNeed}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <Steps title="For hosts" subtitle="Companies with idle vehicles" steps={hostSteps} />
          <Steps title="For renters" subtitle="Companies that need a vehicle for a job" steps={renterSteps} />
        </div>
      </section>

      {/* Hosts + calculator */}
      <section id="hosts" className="scroll-mt-20 bg-brand-900 py-16 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="font-mono text-sm text-lime">FOR FLEET OWNERS</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your parked vehicles are still costing you. Make them pay for themselves.
            </h2>
            <p className="mt-4 text-brand-100">
              Loan payments, insurance and depreciation don&apos;t stop on idle days. Mark the days you don&apos;t need a
              vehicle and let verified businesses cover the cost.
            </p>
            <Link href="/signup" className="mt-8 inline-flex rounded-lg bg-lime px-5 py-3 text-sm font-semibold text-brand-900 hover:brightness-95">
              List your fleet free
            </Link>
          </div>
          <div className="text-stone-900">
            <EarningsCalculator />
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built for businesses, not road trips</h2>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-5 py-3 font-medium"></th>
                <th className="px-5 py-3 font-medium">Peer-to-peer car apps</th>
                <th className="px-5 py-3 font-medium">Rental counters</th>
                <th className="px-5 py-3 font-semibold text-brand-700">Downtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {comparison.map(([row, p2p, counter, us]) => (
                <tr key={row}>
                  <td className="px-5 py-4 font-medium text-stone-900">{row}</td>
                  <td className="px-5 py-4 text-stone-500">{p2p}</td>
                  <td className="px-5 py-4 text-stone-500">{counter}</td>
                  <td className="bg-brand-50/60 px-5 py-4 font-medium text-brand-700">{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 bg-stone-50 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Questions</h2>
          <div className="mt-8 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {faqs.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-stone-900 [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="text-stone-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm text-stone-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-brand-50 p-8 ring-1 ring-brand-100 sm:flex-row sm:items-center sm:p-12">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">One account for hosting and renting.</h2>
            <p className="mt-1 text-stone-600">Set up your company in two minutes. We verify you before your first booking.</p>
          </div>
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">Create a company account</Link>
        </div>
      </section>
    </>
  );
}

function Steps({ title, subtitle, steps }: { title: string; subtitle: string; steps: string[][] }) {
  return (
    <div className="rounded-3xl border border-stone-200 p-6 sm:p-8">
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm text-stone-500">{subtitle}</p>
      <ol className="mt-6 space-y-5">
        {steps.map(([heading, body], i) => (
          <li key={heading} className="flex gap-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-semibold text-lime">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-stone-900">{heading}</p>
              <p className="text-sm text-stone-600">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
