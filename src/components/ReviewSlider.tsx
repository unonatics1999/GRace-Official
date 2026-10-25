"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Two reviews at a time (one on phones). Advances on its own; pauses on hover. */
export function ReviewSlider({ cards, intervalMs = 7000 }: { cards: ReactNode[]; intervalMs?: number }) {
  const pages = Math.ceil(cards.length / 2);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || pages < 2) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pages), intervalMs);
    return () => clearInterval(t);
  }, [paused, pages, intervalMs]);

  const go = (p: number) => setPage((p + pages) % pages);
  const shown = cards.slice(page * 2, page * 2 + 2);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div key={page} className="grid animate-[fadein_.5s_ease] gap-6 md:grid-cols-2">
        {shown.map((card, i) => (
          <div key={i} className={`flex ${i === 1 ? "hidden md:flex" : ""}`}>
            {card}
          </div>
        ))}
      </div>
      {pages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-2">
            {Array.from({ length: pages }, (_, p) => (
              <button
                key={p}
                type="button"
                onClick={() => go(p)}
                aria-label={`Show reviews page ${p + 1}`}
                aria-current={p === page}
                className={`h-1.5 rounded-full transition-all ${p === page ? "w-8 bg-brand-500" : "w-3 bg-stone-300 hover:bg-stone-400"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Arrow label="Previous reviews" onClick={() => go(page - 1)} d="M12.5 15l-5-5 5-5" />
            <Arrow label="Next reviews" onClick={() => go(page + 1)} d="M7.5 5l5 5-5 5" />
          </div>
        </div>
      )}
    </div>
  );
}

function Arrow({ label, onClick, d }: { label: string; onClick: () => void; d: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-11 w-11 place-items-center rounded-full border border-stone-300 text-stone-700 transition hover:border-stone-900 hover:bg-stone-900 hover:text-white"
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </button>
  );
}
