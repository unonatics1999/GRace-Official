import type { ReactNode } from "react";

/** Layout for Terms and Privacy. Both are drafts until a Philippine lawyer reviews them. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Draft for review by counsel. It is not final and does not yet bind anyone.
      </p>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6 space-y-6 text-stone-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-stone-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </article>
  );
}
