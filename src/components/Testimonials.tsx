import { StarIcon } from "@/components/ListingCard";
import { ReviewSlider } from "@/components/ReviewSlider";
import { SectionHeading } from "@/components/SectionHeading";
import { db } from "@/lib/db";

/** Real renter reviews with a comment, newest first, plus the overall average. */
async function loadTestimonials() {
  const [reviews, summary] = await Promise.all([
    db.review.findMany({
      where: { comment: { not: "" }, vehicleRating: { gte: 4 } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        vehicleRating: true,
        comment: true,
        author: { select: { name: true } },
        booking: { select: { mode: true, renterCompany: { select: { city: true } }, vehicle: { select: { make: true, model: true } } } },
      },
    }),
    db.review.aggregate({ _avg: { vehicleRating: true }, _count: true }),
  ]);
  return { reviews, average: summary._avg.vehicleRating, count: summary._count };
}

/** "Juan dela Cruz" -> "Juan D." so reviewers aren't fully named in public. */
function shortName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

function Stars({ n, className = "h-4 w-4" }: { n: number; className?: string }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} className={`${className} ${i < n ? "text-amber-500" : "text-stone-200"}`} />
      ))}
    </div>
  );
}

export async function Testimonials() {
  const { reviews, average, count } = await loadTestimonials();

  return (
    <section id="reviews" className="scroll-mt-24 bg-stone-50 py-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div>
          <SectionHeading eyebrow="Client stories" title="What renters say about GRace">
            Every review comes from a completed, paid trip. No anonymous posts, no paid endorsements.
          </SectionHeading>
          {count > 0 && average !== null && (
            <div className="mt-8 flex items-center gap-4">
              <p className="text-5xl font-semibold tracking-tight text-stone-900">{average.toFixed(1)}</p>
              <div>
                <Stars n={Math.round(average)} className="h-5 w-5" />
                <p className="mt-1 text-sm text-stone-500">
                  Average from {count} verified review{count === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="self-center text-stone-600">Reviews from our first renters will appear here.</p>
        ) : (
          <ReviewSlider
            cards={reviews.map((r) => (
              <figure key={r.id} className="flex w-full flex-col rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200/70">
                <div className="flex items-start justify-between">
                  <svg viewBox="0 0 32 24" className="h-7 w-9 text-brand-500" fill="currentColor" aria-hidden="true">
                    <path d="M0 24V14.4C0 6.4 4.3 1.6 12.4 0l1.5 3.3C9.4 4.6 7.2 7.3 7 11h6v13H0zm18 0V14.4C18 6.4 22.3 1.6 30.4 0l1.5 3.3c-4.5 1.3-6.7 4-6.9 7.7h6v13H18z" />
                  </svg>
                  <Stars n={r.vehicleRating} />
                </div>
                <blockquote className="mt-6 flex-1 text-lg leading-relaxed text-stone-800">{r.comment}</blockquote>
                <figcaption className="mt-8 flex items-center gap-4 border-t border-stone-100 pt-6">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-stone-900 text-base font-semibold text-white">
                    {r.author.name.trim()[0]?.toUpperCase()}
                  </span>
                  <div className="text-sm">
                    <p className="font-semibold text-stone-900">{shortName(r.author.name)}</p>
                    <p className="text-stone-500">
                      {r.booking.vehicle.make} {r.booking.vehicle.model} · {r.booking.mode === "WITH_DRIVER" ? "With driver" : "Self-drive"}
                      {r.booking.renterCompany.city && <> · {r.booking.renterCompany.city}</>}
                    </p>
                  </div>
                </figcaption>
              </figure>
            ))}
          />
        )}
      </div>
    </section>
  );
}
