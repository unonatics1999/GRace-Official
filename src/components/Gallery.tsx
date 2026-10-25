"use client";

import { useState } from "react";

/** Large photo with a thumbnail strip; the cover photo shows first. */
export function Gallery({ photos, alt }: { photos: { id: string; url: string }[]; alt: string }) {
  const [active, setActive] = useState(0);
  const current = photos[active] ?? photos[0];
  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-stone-100 ring-1 ring-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element -- served by our own auth-checked route */}
        <img src={current.url} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
          {active + 1} / {photos.length}
        </span>
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl ring-2 transition ${
                i === active ? "ring-brand-600" : "ring-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`Photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail of the same photo */}
              <img src={p.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
