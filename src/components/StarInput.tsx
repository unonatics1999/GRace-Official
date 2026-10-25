"use client";

import { useState } from "react";

/** 1–5 star picker that submits as a hidden input. */
export function StarInput({ name, label }: { name: string; label: string }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={value || ""} />
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className={`text-3xl leading-none transition ${(hover || value) >= n ? "text-amber-500" : "text-stone-300"}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
