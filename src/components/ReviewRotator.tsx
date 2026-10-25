"use client";

import { useEffect, useState, type ReactNode } from "react";

const VISIBLE = 6; // two rows of three on desktop

/** Shows two rows of review cards and moves on by one row every few seconds. */
export function ReviewRotator({ cards, intervalMs = 6000 }: { cards: ReactNode[]; intervalMs?: number }) {
  const [start, setStart] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = cards.length;

  useEffect(() => {
    if (paused || count <= VISIBLE) return;
    const t = setInterval(() => setStart((s) => (s + 3) % count), intervalMs);
    return () => clearInterval(t);
  }, [paused, count, intervalMs]);

  const shown = Array.from({ length: Math.min(VISIBLE, count) }, (_, i) => (start + i) % count);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <ul key={start} className="grid animate-[fadein_.6s_ease] gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((i, pos) => (
          // One column shows two cards, two columns show four, three columns show six: always two rows.
          <li key={i} className={`flex ${pos >= 4 ? "hidden lg:flex" : pos >= 2 ? "hidden sm:flex" : ""}`}>
            {cards[i]}
          </li>
        ))}
      </ul>
      {count > VISIBLE && (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: Math.ceil(count / 3) }, (_, page) => (
            <button
              key={page}
              type="button"
              onClick={() => setStart(page * 3)}
              aria-label={`Show reviews ${page * 3 + 1} to ${Math.min(count, page * 3 + VISIBLE)}`}
              aria-current={start === page * 3}
              className={`h-2 rounded-full transition-all ${start === page * 3 ? "w-6 bg-brand-600" : "w-2 bg-stone-300 hover:bg-stone-400"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
