// Side-profile illustration per vehicle type, until hosts can upload photos.
// The background tint is picked from the vehicle id, so each listing keeps its own colour.

const TINTS = [
  ["#e8f3ec", "#1f5139"],
  ["#eef0f8", "#2c3a6b"],
  ["#f8efe6", "#8a4b1c"],
  ["#f1eef8", "#4b2f7a"],
  ["#e9f4f6", "#1d5560"],
  ["#f6f3e4", "#6b5a12"],
] as const;

function tint(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length];
}

const BODIES: Record<string, { body: string; windows: string[] }> = {
  CARGO_VAN: {
    body: "M22 74 V36 Q22 28 30 28 H132 Q142 28 150 36 L170 54 Q178 57 178 66 V74 Z",
    windows: ["M138 34 H146 L164 52 H138 Z"],
  },
  PASSENGER_VAN: {
    body: "M22 74 V36 Q22 28 30 28 H132 Q142 28 150 36 L170 54 Q178 57 178 66 V74 Z",
    windows: ["M32 36 H56 V52 H32 Z", "M62 36 H86 V52 H62 Z", "M92 36 H116 V52 H92 Z", "M122 34 H146 L164 52 H122 Z"],
  },
  PICKUP: {
    body: "M20 74 V52 H96 V34 Q96 28 102 28 H132 Q140 28 146 36 L160 52 H170 Q180 54 180 64 V74 Z",
    windows: ["M104 34 H130 Q136 34 140 40 L150 52 H104 Z"],
  },
  BOX_TRUCK: {
    body: "M18 74 V24 Q18 20 22 20 H122 V74 Z M126 74 V40 Q126 36 130 36 H154 Q160 36 164 42 L176 56 Q180 60 180 66 V74 Z",
    windows: ["M134 42 H152 Q156 42 159 46 L168 56 H134 Z"],
  },
  SEDAN: {
    body: "M20 74 V62 Q20 54 30 52 L56 48 L78 32 Q84 28 92 28 H128 Q136 28 142 34 L158 50 L170 52 Q180 54 180 64 V74 Z",
    windows: ["M66 50 L84 36 Q88 34 92 34 H108 V50 Z", "M114 34 H128 Q132 34 136 38 L148 50 H114 Z"],
  },
};

export function VehicleArt({ type, seed, className = "" }: { type: string; seed: string; className?: string }) {
  const [bg, fg] = tint(seed);
  const shape = BODIES[type] ?? BODIES.CARGO_VAN;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: bg }}>
      <svg viewBox="0 0 200 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <ellipse cx="100" cy="86" rx="84" ry="5" fill={fg} opacity="0.12" />
        <path d={shape.body} fill={fg} />
        {shape.windows.map((d) => (
          <path key={d} d={d} fill={bg} opacity="0.85" />
        ))}
        {[52, 150].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="76" r="11" fill="#1c2420" />
            <circle cx={cx} cy="76" r="4.5" fill={bg} />
          </g>
        ))}
      </svg>
    </div>
  );
}
