import type { ReactNode } from "react";

/** The one heading style every home-page section uses: eyebrow, title, optional intro. */
export function SectionHeading({
  eyebrow,
  title,
  children,
  tone = "light",
  center = false,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  tone?: "light" | "dark";
  center?: boolean;
}) {
  const dark = tone === "dark";
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${dark ? "text-lime" : "text-brand-600"}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${dark ? "text-white" : "text-stone-900"}`}>{title}</h2>
      {children && <p className={`mt-4 text-lg leading-relaxed ${dark ? "text-stone-400" : "text-stone-600"}`}>{children}</p>}
    </div>
  );
}
