import Link from "next/link";
import { EarningsCalculator } from "@/components/EarningsCalculator";
import { HeroCarousel } from "@/components/HeroCarousel";
import { ListingCard, VerifiedIcon } from "@/components/ListingCard";
import { SearchBar } from "@/components/SearchBar";
import { SectionHeading } from "@/components/SectionHeading";
import { Testimonials } from "@/components/Testimonials";
import { VehicleImage } from "@/components/VehicleImage";
import { getLiveListings } from "@/lib/listing-cache";
import { formatCents } from "@/lib/util";

const principles = [
  {
    title: "Verified before every booking",
    body: "Owners submit a government ID, OR/CR and CTPL. Drivers hold an LTO Professional licence and an NBI clearance. Nothing goes live until our team has checked it.",
    icon: "M10 1.5l7 3v5c0 4.3-2.9 7.9-7 9-4.1-1.1-7-4.7-7-9v-5l7-3zm-3 8.5l2 2 4-4",
  },
  {
    title: "Transparent from start to finish",
    body: "One clear price before you book, paid securely through PayMongo. Timestamped photos at pick-up and return protect renter and owner alike.",
    icon: "M2.5 10s2.8-5.5 7.5-5.5 7.5 5.5 7.5 5.5-2.8 5.5-7.5 5.5S2.5 10 2.5 10zm7.5 2.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  },
  {
    title: "Fair to the people who share",
    body: "Owners choose their own days and rates, and keep more of every booking as their rating grows. Good service is rewarded, every trip.",
    icon: "M10 17s-6.5-3.9-6.5-8.6A3.6 3.6 0 0110 6a3.6 3.6 0 016.5 2.4C16.5 13.1 10 17 10 17z",
  },
];

const renterSteps = [
  ["Choose your car and dates", "Sedans for the city, seven-seaters for the family, an L300 for the big move."],
  ["Drive yourself or book a driver", "Self-drive with a verified licence, or ride with the owner as your professional driver."],
  ["Pay securely and go", "GCash, Maya or card through PayMongo. A photo checklist at pick-up and return keeps it fair."],
];
const hostSteps = [
  ["Apply with your car", "Upload your OR/CR, CTPL and photos. We review every listing before it goes live."],
  ["Drive it yourself, if you like", "Add your professional licence and NBI clearance to earn the driver fee as well."],
  ["Earn on your free days", "Open only the days you don't need the car. Higher ratings mean a lower commission."],
];

const comparison = [
  ["Who you rent from", "A rental company", "Unknown individuals", "Owners verified by ID, OR/CR and CTPL"],
  ["Driver", "Extra fee, often a stranger", "Rarely offered", "The owner, with a professional licence and NBI clearance"],
  ["Condition record", "Paper form", "Varies", "Timestamped photos confirmed by both sides"],
  ["Payment", "Cash deposit", "Bank transfer to a stranger", "GCash, Maya or card, held securely by GRace"],
];

const faqs = [
  ["Who can rent?", "Anyone with an account and a mobile number can book a car with a driver, with no ID needed. To drive yourself, verify your government ID and add a valid driver's licence. Businesses are welcome too."],
  ["Who drives if I book with a driver?", "The car's owner or their approved driver. Every driver holds an LTO Professional licence and has an NBI clearance on file, and you can see their rating before you book."],
  ["How do I pay?", "Once the owner approves your request, you pay through PayMongo with GCash, Maya, card or QR Ph. Your booking is confirmed the moment payment goes through."],
  ["What if something gets damaged?", "Both sides photograph the car at pick-up and return, and the other side confirms. If something is wrong, report it in the booking and GRace support steps in. The owner's payout is held until it's resolved."],
  ["What does it cost to list my car?", "Listing is free. GRace takes a commission from each booking, and it gets lower as your driver rating goes up."],
];

export default async function Home() {
  const featured = [...(await getLiveListings())].sort((a, b) => +b.createdAt - +a.createdAt).slice(0, 8);

  return (
    <>
      {/* Hero */}
      <section className="bg-[#0b0b0b] text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-12 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-lime">
              <VerifiedIcon className="h-4 w-4 text-lime" /> Verified owners across Metro Manila
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Rent a car,
              <br />
              <span className="text-lime">or the car and its driver.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-stone-400">
              GRace connects you with verified car owners. Drive yourself, or book the owner as your professional driver, with one
              clear price and secure payment.
            </p>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-stone-300">
              {["LTO papers and CTPL verified", "No ID needed with a driver", "GCash, Maya or card"].map((item) => (
                <li key={item} className="flex items-center gap-2 whitespace-nowrap">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime/15 text-[11px] text-lime">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <HeroCarousel
            slides={featured.map((v) => (
              <Link key={v.id} href={`/listing/${v.id}`} className="group relative block h-full">
                <VehicleImage vehicle={v} className="h-full rounded-3xl" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-stone-900 shadow-lg">
                  <div>
                    <p className="text-sm font-semibold">{v.make} {v.model} · {v.color}</p>
                    <p className="text-xs text-stone-500">{v.seats} seats · {v.city}</p>
                  </div>
                  <p className="text-right text-sm">
                    <span className="font-semibold">{formatCents(v.dailyRateCents)}</span>
                    <span className="text-stone-500">/day</span>
                  </p>
                </div>
              </Link>
            ))}
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="text-stone-900">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Fleet */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex items-end justify-between gap-6">
            <SectionHeading eyebrow="Available now" title="Cars ready for your next trip">
              Listed by their owners, checked by GRace.
            </SectionHeading>
            <Link href="/explore" className="hidden shrink-0 text-sm font-semibold text-brand-600 hover:underline sm:block">
              View all cars →
            </Link>
          </div>
          <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((v) => <ListingCard key={v.id} vehicle={v} />)}
          </div>
        </section>
      )}

      {/* About / mission */}
      <section id="about" className="scroll-mt-24 border-t border-stone-200 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow="About GRace" title="Car rental built on trust, not guesswork.">
              Thousands of well-kept cars in Metro Manila sit parked most of the week, while families and businesses struggle to find
              a reliable ride. GRace brings the two together, and verifies every owner, car and driver before a single booking is made.
            </SectionHeading>
            <div className="mt-8 border-l-2 border-brand-500 pl-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Our mission</p>
              <p className="mt-2 text-lg font-medium leading-relaxed text-stone-900">
                To make every car rental in the Philippines safe, simple and fair, for the people who rent and the people who share.
              </p>
            </div>
          </div>
          <ul className="grid gap-4">
            {principles.map((p) => (
              <li key={p.title} className="flex gap-5 rounded-2xl border border-stone-200 bg-white p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={p.icon} />
                  </svg>
                </span>
                <div>
                  <p className="font-semibold text-stone-900">{p.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Testimonials />

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="How it works" title="Book in minutes. List in a day.">
          A simple, guided flow whether you&apos;re renting a car or sharing your own.
        </SectionHeading>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Steps title="Renting a car" subtitle="For individuals and businesses" steps={renterSteps} />
          <Steps title="Listing your car" subtitle="For owners and owner-drivers" steps={hostSteps} />
        </div>
      </section>

      {/* Hosts + calculator */}
      <section id="hosts" className="scroll-mt-24 bg-brand-900 py-20 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading eyebrow="For car owners" title="Your car is parked more than it's driven. Let it earn." tone="dark">
              Amortization, insurance and registration don&apos;t pause on the days you stay home. Share your car on those days, drive
              it yourself for the driver fee, and get paid every week.
            </SectionHeading>
            <Link href="/signup" className="mt-8 inline-flex rounded-lg bg-lime px-5 py-3 text-sm font-semibold text-brand-900 hover:brightness-95">
              List your car for free
            </Link>
          </div>
          <div className="text-stone-900">
            <EarningsCalculator />
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="Why GRace" title="A safer way to rent than shops or social media.">
          Here&apos;s how renting through GRace compares with the usual options.
        </SectionHeading>
        <div className="mt-10 overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="w-1/4 px-6 py-4 font-medium"></th>
                <th className="w-1/4 px-6 py-4 font-medium">Rent-a-car shops</th>
                <th className="w-1/4 px-6 py-4 font-medium">Social media rentals</th>
                <th className="w-1/4 px-6 py-4 font-semibold text-brand-600">GRace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {comparison.map(([row, shop, social, us]) => (
                <tr key={row}>
                  <td className="px-6 py-4 font-medium text-stone-900">{row}</td>
                  <td className="px-6 py-4 text-stone-500">{shop}</td>
                  <td className="px-6 py-4 text-stone-500">{social}</td>
                  <td className="bg-brand-50/60 px-6 py-4 font-medium text-stone-900">{us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 bg-stone-50 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions">
            Can&apos;t find your answer? Visit the <Link href="/help" className="font-medium text-brand-600 underline">Help center</Link>.
          </SectionHeading>
          <div className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {faqs.map(([q, a]) => (
              <details key={q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-stone-900 [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-stone-200 text-stone-500 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-8 rounded-3xl bg-[#0b0b0b] p-10 text-white sm:p-14 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready when you are.</h2>
            <p className="mt-3 text-lg text-stone-400">Create a free account to rent a car, book a driver or list your own vehicle.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-lg bg-lime px-6 py-3 text-sm font-semibold text-brand-900 hover:brightness-95">
              Create an account
            </Link>
            <Link href="/explore" className="rounded-lg border border-white/25 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Browse cars
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Steps({ title, subtitle, steps }: { title: string; subtitle: string; steps: string[][] }) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-8">
      <p className="text-lg font-semibold text-stone-900">{title}</p>
      <p className="text-sm text-stone-500">{subtitle}</p>
      <ol className="mt-8 space-y-6">
        {steps.map(([heading, body], i) => (
          <li key={heading} className="flex gap-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-900 text-sm font-semibold text-white">{i + 1}</span>
            <div>
              <p className="font-medium text-stone-900">{heading}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-stone-600">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
