import { StarIcon } from "@/components/ListingCard";
import { ReviewRotator } from "@/components/ReviewRotator";
import { db } from "@/lib/db";

/** Real renter reviews with a comment, newest first. Shown on the home page above How it works. */
async function loadTestimonials() {
  return db.review.findMany({
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
  });
}

/** "Juan dela Cruz" -> "Juan D." so reviewers aren't fully named in public. */
function shortName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export async function Testimonials() {
  const reviews = await loadTestimonials();

  return (
    <section id="reviews" className="scroll-mt-20 bg-stone-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="font-mono text-sm text-brand-600">WHAT CLIENTS SAY</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Trusted by renters across Metro Manila</h2>
        {reviews.length === 0 ? (
          <p className="mt-4 text-stone-600">Reviews from our first renters will appear here. Every review comes from a completed, paid trip.</p>
        ) : (
          <div className="mt-8">
            <ReviewRotator
              cards={reviews.map((r) => (
              <article key={r.id} className="flex w-full flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex gap-0.5" aria-label={`${r.vehicleRating} out of 5 stars`}>
                  {Array.from({ length: r.vehicleRating }, (_, i) => <StarIcon key={i} className="h-4 w-4 text-amber-500" />)}
                </div>
                <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-stone-800">&ldquo;{r.comment}&rdquo;</blockquote>
                <div className="mt-5 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 font-semibold text-brand-600">{r.author.name.trim()[0]?.toUpperCase()}</span>
                  <div className="text-sm">
                    <p className="font-semibold text-stone-900">{shortName(r.author.name)}</p>
                    <p className="text-stone-500">
                      {r.booking.renterCompany.city && <>{r.booking.renterCompany.city} · </>}
                      {r.booking.vehicle.make} {r.booking.vehicle.model}
                      {r.booking.mode === "WITH_DRIVER" ? " with driver" : " self-drive"}
                    </p>
                  </div>
                </div>
              </article>
              ))}
            />
          </div>
        )}
      </div>
    </section>
  );
}
