"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Cycles through slides every few seconds; pauses while hovered or focused. */
export function HeroCarousel({ slides, intervalMs = 4500 }: { slides: ReactNode[]; intervalMs?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(t);
  }, [paused, count, intervalMs]);

  if (count === 0) return null;
  const go = (i: number) => setIndex((i + count) % count);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Available cars"
    >
      <div className="relative aspect-[4/3]">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`}
            aria-hidden={i !== index}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
          >
            {slide}
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} aria-label="Previous car" className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-xl text-stone-900 shadow hover:bg-white">‹</button>
          <button type="button" onClick={() => go(index + 1)} aria-label="Next car" className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-xl text-stone-900 shadow hover:bg-white">›</button>
          <div className="mt-4 flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show car ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-lime" : "w-2 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
