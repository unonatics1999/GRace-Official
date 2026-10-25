import { StarIcon } from "@/components/ListingCard";
import { db } from "@/lib/db";

/** Real renter reviews with a comment, newest first. Shown on the home page hero. */
async function loadTestimonials() {
  return db.review.findMany({
    where: { comment: { not: "" }, vehicleRating: { gte: 4 } },
    orderBy: { createdAt: "desc" },
    take: 3,
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

  if (reviews.length === 0) {
    return (
      <div className="rounded-[2rem] bg-white/5 p-8 ring-1 ring-white/10">
        <p className="font-mono text-sm text-lime">WHAT CLIENTS SAY</p>
        <p className="mt-4 text-2xl font-semibold">Reviews from our first renters will appear here.</p>
        <p className="mt-3 text-stone-300">Every review comes from a completed, paid trip, so you can trust what you read.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-mono text-sm text-lime">WHAT CLIENTS SAY</p>
      <ul className="mt-4 space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-2xl bg-white/95 p-5 text-stone-900 shadow-xl">
            <div className="flex gap-0.5" aria-label={`${r.vehicleRating} out of 5 stars`}>
              {Array.from({ length: r.vehicleRating }, (_, i) => <StarIcon key={i} className="h-4 w-4 text-amber-500" />)}
            </div>
            <blockquote className="mt-2 text-[15px] leading-relaxed">&ldquo;{r.comment}&rdquo;</blockquote>
            <p className="mt-3 text-sm text-stone-500">
              <span className="font-semibold text-stone-900">{shortName(r.author.name)}</span>
              {r.booking.renterCompany.city && <> · {r.booking.renterCompany.city}</>} · {r.booking.vehicle.make} {r.booking.vehicle.model}
              {r.booking.mode === "WITH_DRIVER" ? " with driver" : " self-drive"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
