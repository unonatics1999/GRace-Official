// Studio-style side profile of a vehicle in its real paint colour, shown until the host
// uploads photos. Sedan, MPV, SUV, van and pickup silhouettes; backdrop tint varies per listing.

const BACKDROPS = [
  ["#eef3f0", "#d9e6de"],
  ["#eef0f6", "#d8dded"],
  ["#f5f0ea", "#e8ddd0"],
  ["#f0eef5", "#e0dbec"],
  ["#ecf3f5", "#d4e4e8"],
] as const;

type Shape = { body: string; windows: string[]; wheels: [number, number]; wheelR: number; line: string };

const SHAPES: Record<string, Shape> = {
  SEDAN: {
    body: "M28 112 L28 97 Q30 87 44 85 L88 80 L120 57 Q128 51 142 51 L206 51 Q220 51 231 59 L260 80 L290 86 Q302 90 302 102 L302 112 Z",
    windows: [
      "M106 80 L127 61 Q133 57 143 57 L172 57 L172 80 Z",
      "M179 57 L205 57 Q215 57 223 63 L246 80 L179 80 Z",
    ],
    wheels: [84, 250],
    wheelR: 20,
    line: "M40 96 H292",
  },
  MPV: {
    body: "M38 114 L38 91 Q40 79 54 77 L82 73 L104 41 Q110 33 122 33 L228 33 Q240 33 248 41 L272 71 L287 77 Q296 81 296 95 L296 114 Z",
    windows: [
      "M96 73 L114 43 Q117 39 124 39 L154 39 L154 73 Z",
      "M161 39 H203 V73 H161 Z",
      "M210 39 L228 39 Q236 39 242 45 L263 73 L210 73 Z",
    ],
    wheels: [88, 248],
    wheelR: 21,
    line: "M48 95 H288",
  },
  SUV: {
    body: "M26 110 L26 86 Q28 74 42 72 L78 68 L98 44 Q104 38 116 38 L230 38 Q242 38 250 46 L272 68 L292 74 Q302 78 302 90 L302 110 Z",
    windows: [
      "M92 68 L109 48 Q113 44 121 44 L156 44 L156 68 Z",
      "M163 44 H205 V68 H163 Z",
      "M212 44 L229 44 Q237 44 243 50 L262 68 L212 68 Z",
    ],
    wheels: [84, 250],
    wheelR: 24,
    line: "M38 90 H292",
  },
  VAN: {
    body: "M24 114 V40 Q24 31 33 31 H258 Q273 31 281 43 L297 71 Q302 79 302 89 V114 Z",
    windows: [
      "M40 41 H92 V69 H40 Z",
      "M100 41 H152 V69 H100 Z",
      "M160 41 H212 V69 H160 Z",
      "M244 41 H265 Q271 41 275 48 L288 69 H244 Z",
    ],
    wheels: [80, 250],
    wheelR: 21,
    line: "M30 92 H298",
  },
  PICKUP: {
    body: "M24 114 V84 H158 V55 Q158 46 167 46 H220 Q232 46 241 56 L263 82 H284 Q302 84 302 98 V114 Z",
    windows: ["M171 54 H216 Q224 54 230 62 L246 82 H171 Z"],
    wheels: [80, 250],
    wheelR: 22,
    line: "M30 96 H298",
  },
};

function hash(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Mixes a hex colour toward white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const target = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  const ch = (c: number) => Math.round(c + (target - c) * a).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

type Props = { type: string; seed: string; colorHex?: string; className?: string };

export function VehicleArt({ type, seed, colorHex = "#1c1c1c", className = "" }: Props) {
  const shape = SHAPES[type] ?? SHAPES.SEDAN;
  const [bgTop, bgBottom] = BACKDROPS[hash(seed) % BACKDROPS.length];
  const id = `va${hash(seed + type).toString(36)}`;
  const [w1, w2] = shape.wheels;
  const ground = 112 + (shape.wheelR - 20);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(180deg, ${bgTop}, ${bgBottom})` }}>
      <svg viewBox="0 0 330 160" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={shade(colorHex, 0.35)} />
            <stop offset="0.45" stopColor={colorHex} />
            <stop offset="1" stopColor={shade(colorHex, -0.45)} />
          </linearGradient>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9fb3c8" stopOpacity="0.95" />
            <stop offset="0.5" stopColor="#2b3540" />
            <stop offset="1" stopColor="#141a20" />
          </linearGradient>
          <radialGradient id={`${id}r`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f4f4f4" />
            <stop offset="0.7" stopColor="#a9adb3" />
            <stop offset="1" stopColor="#5d6168" />
          </radialGradient>
          <radialGradient id={`${id}s`} cx="0.5" cy="0.35" r="0.6">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Studio light and floor */}
        <ellipse cx="165" cy="60" rx="170" ry="80" fill={`url(#${id}s)`} />
        <circle cx={hash(seed) % 2 ? 290 : 40} cy="22" r="64" fill="#ffffff" opacity="0.18" />
        <ellipse cx="165" cy={ground + 18} rx="150" ry="9" fill="#000" opacity="0.18" />

        <g transform={`translate(0 ${shape.wheelR - 20})`}>
          <path d={shape.body} fill={`url(#${id}b)`} />
          {/* Shoulder highlight and door line */}
          <path d={shape.line} stroke={shade(colorHex, 0.5)} strokeOpacity="0.35" strokeWidth="1.5" fill="none" />
          {shape.windows.map((d) => (
            <path key={d} d={d} fill={`url(#${id}g)`} />
          ))}
          {/* Lights */}
          <rect x="292" y={type === "VAN" ? 80 : 90} width="9" height="5" rx="2" fill="#fff6d6" />
          <rect x="27" y={type === "VAN" ? 80 : 92} width="7" height="5" rx="2" fill="#d64545" />
        </g>

        {[w1, w2].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={ground} r={shape.wheelR + 2} fill="#0d0f12" />
            <circle cx={cx} cy={ground} r={shape.wheelR * 0.62} fill={`url(#${id}r)`} />
            {[0, 72, 144, 216, 288].map((deg) => (
              <rect
                key={deg}
                x={cx - 1.5}
                y={ground - shape.wheelR * 0.58}
                width="3"
                height={shape.wheelR * 0.5}
                rx="1.5"
                fill="#6b7078"
                transform={`rotate(${deg} ${cx} ${ground})`}
              />
            ))}
            <circle cx={cx} cy={ground} r="3.5" fill="#2a2d33" />
          </g>
        ))}
      </svg>
    </div>
  );
}
