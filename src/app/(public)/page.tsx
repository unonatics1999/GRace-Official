import Link from "next/link";
import { EarningsCalculator } from "@/components/EarningsCalculator";
import { ListingCard, StarIcon, VerifiedIcon } from "@/components/ListingCard";
import { SearchBar } from "@/components/SearchBar";
import { Testimonials } from "@/components/Testimonials";
import { getLiveListings } from "@/lib/listing-cache";

const renterSteps = [
  ["Pick a car and your dates", "Sedans for the city, 7-seaters for the family, an L300 for the move."],
  ["Self-drive or with driver", "Drive it yourself with your licence, or ride with the owner at the wheel."],
  ["Pay safely, then go", "GCash, Maya or card through PayMongo. Photo checklist at pick-up and return."],
];
const hostSteps = [
  ["Apply with your car", "OR/CR, CTPL and photos. GRace checks everything before you go live."],
  ["Drive it yourself, if you like", "Add your professional licence and NBI clearance to earn the driver fee too."],
  ["Earn on your free days", "Choose the days it's available. Better ratings mean a lower commission."],
];

const comparison = [
  ["Who you rent from", "A rental company", "Unknown individuals", "Owners verified by ID, OR/CR and CTPL"],
  ["Driver", "Extra, often a stranger", "Rarely offered", "The owner, with a pro licence and NBI clearance"],
  ["Car condition record", "Paper form", "Varies", "Timestamped photos, both sides confirm"],
  ["Payment", "Cash deposit", "Bank transfer to a stranger", "GCash, Maya, card, held by GRace"],
];

const faqs = [
  ["Who can rent?", "Anyone with an account and a mobile number can book a car with a driver, with no ID needed. To drive yourself, verify your government ID and add a valid driver's licence. Businesses can book too."],
  ["Who drives if I book with a driver?", "The car's owner or their approved driver. Every driver holds an LTO Professional licence and has submitted an NBI clearance, and you can see their rating before you book."],
  ["How do I pay?", "After the owner approves your request, you pay through PayMongo with GCash, Maya, cards or QR Ph. Your booking is confirmed the moment payment goes through."],
  ["What if something gets damaged?", "Both sides photograph the car at pick-up and return, and the other side confirms. If something's wrong, report it in the booking and GRace support steps in. The owner's payout is held until it's resolved."],
  ["What does it cost to list my car?", "Listing is free. GRace takes a commission from each booking, and it gets lower as your driver rating goes up."],
];

export default async function Home() {
  const featured = [...(await getLiveListings())].sort((a, b) => +b.createdAt - +a.createdAt).slice(0, 8);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0b0b0b] text-white">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -left-24 h-[420px] w-[420px] rounded-full bg-lime/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-lime ring-1 ring-white/15">
              <VerifiedIcon className="h-3.5 w-3.5 text-lime" /> Every owner and driver verified
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
              Rent a car, <span className="text-lime">or the car and its driver.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-stone-300">
              Book cars from verified owners across Metro Manila on the days they don&apos;t need them. Drive it yourself, or ride with
              the owner behind the wheel.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-300">
              <span>✓ LTO papers and CTPL checked</span>
              <span>✓ With driver: no ID needed</span>
              <span>✓ GCash · Maya · Card</span>
            </div>
          </div>
          <Testimonials />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <div className="text-stone-900">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Fleet */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Available now</h2>
              <p className="mt-1 text-stone-500">Owner-listed, GRace-checked.</p>
            </div>
            <Link href="/explore" className="hidden text-sm font-medium text-brand-600 hover:underline sm:block">View all →</Link>
          </div>
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 8).map((v) => <ListingCard key={v.id} vehicle={v} />)}
          </div>
        </section>
      )}

      {/* With driver */}
      <section className="bg-stone-50 py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="font-mono text-sm text-brand-600">WITH DRIVER</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">The best driver for a car is the person who owns it.</h2>
            <p className="mt-3 text-stone-600">
              Owners know their car, take care of it, and earn more when they drive well. Every driver on GRace holds an LTO Professional licence, has an NBI clearance on file, and carries a public rating from real trips.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-stone-700">
              <li className="flex gap-3"><span className="text-brand-600">●</span> Airport runs, out-of-town trips, events, client visits</li>
              <li className="flex gap-3"><span className="text-brand-600">●</span> See the driver&apos;s rating and experience before you book</li>
              <li className="flex gap-3"><span className="text-brand-600">●</span> Higher-rated drivers keep more of every booking, so they want five stars</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-stone-900 text-xl font-semibold text-white">D</div>
              <div>
                <p className="font-semibold">Your driver</p>
                <p className="flex items-center gap-1 text-sm text-stone-500"><StarIcon /> Rating shown on every listing</p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Licence", "LTO Professional"],
                ["Background", "NBI clearance"],
                ["Experience", "2+ years required"],
                ["Accountability", "Rated after every trip"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-stone-50 p-3">
                  <dt className="text-xs text-stone-500">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Steps title="Renting" subtitle="Individuals and businesses" steps={renterSteps} />
          <Steps title="Listing your car" subtitle="Owners and owner-drivers" steps={hostSteps} />
        </div>
      </section>

      {/* Hosts + calculator */}
      <section id="hosts" className="scroll-mt-20 bg-brand-900 py-16 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="font-mono text-sm text-lime">FOR CAR OWNERS</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your car is parked more than it&apos;s driven. Let it earn.</h2>
            <p className="mt-4 text-brand-100">
              Amortization, insurance and registration don&apos;t stop on the days you stay home. List your car for those days, drive it yourself if you want the driver fee too, and get paid every week.
            </p>
            <Link href="/signup" className="mt-8 inline-flex rounded-lg bg-lime px-5 py-3 text-sm font-semibold text-brand-900 hover:brightness-95">
              List your car free
            </Link>
          </div>
          <div className="text-stone-900"><EarningsCalculator /></div>
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Why GRace</h2>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-5 py-3 font-medium"></th>
                <th className="px-5 py-3 font-medium">Rent-a-car shops</th>
                <th className="px-5 py-3 font-medium">Facebook rentals</th>
                <th className="px-5 py-3 font-semibold text-brand-700">GRace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {comparison.map(([row, shop, fb, us]) => (
                <tr key={row}>
                  <td className="px-5 py-4 font-medium text-stone-900">{row}</td>
                  <td className="px-5 py-4 text-stone-500">{shop}</td>
                  <td className="px-5 py-4 text-stone-500">{fb}</td>
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
            <h2 className="text-2xl font-semibold tracking-tight">One account to rent, drive and earn.</h2>
            <p className="mt-1 text-stone-600">Sign up in two minutes. We verify you before your first booking.</p>
          </div>
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">Create an account</Link>
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
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-semibold text-lime">{i + 1}</span>
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
