import Link from "next/link";
import { HelpAssistant } from "@/components/HelpAssistant";
import { HELP_ARTICLES, HELP_CATEGORIES, searchHelp } from "@/lib/help-content";

export const metadata = { title: "Help center · Downtime" };

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? searchHelp(query, 8) : [];

  return (
    <div>
      <section className="bg-brand-900 py-14 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">How can we help?</h1>
          <form action="/help" className="mx-auto mt-6 flex max-w-xl gap-2">
            <input name="q" defaultValue={query} placeholder="Search: payment, cancel, driver, ID…" className="input flex-1 py-3 text-stone-900" />
            <button className="rounded-lg bg-lime px-5 font-semibold text-brand-900">Search</button>
          </form>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-10">
          {query && (
            <section>
              <h2 className="text-lg font-semibold">Results for &ldquo;{query}&rdquo;</h2>
              {results.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">No articles matched. Try the assistant, or contact support below.</p>
              ) : (
                <ArticleList articles={results} />
              )}
            </section>
          )}

          {HELP_CATEGORIES.map((category) => (
            <section key={category} id={category.toLowerCase().replace(/\s+/g, "-")}>
              <h2 className="text-lg font-semibold">{category}</h2>
              <ArticleList articles={HELP_ARTICLES.filter((a) => a.category === category)} />
            </section>
          ))}

          <section className="rounded-2xl bg-stone-50 p-6">
            <h2 className="font-semibold">Still need help?</h2>
            <p className="mt-1 text-sm text-stone-600">
              For a problem with a specific booking, open it under My trips or Bookings and use <strong>Something wrong?</strong>. Downtime
              support replies there. For anything else, email support.
            </p>
            <Link href="/explore" className="btn-secondary mt-4">Back to the cars</Link>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <HelpAssistant />
        </aside>
      </div>
    </div>
  );
}

function ArticleList({ articles }: { articles: { id: string; question: string; answer: string }[] }) {
  return (
    <div className="mt-3 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
      {articles.map((a) => (
        <details key={a.id} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-stone-900 [&::-webkit-details-marker]:hidden">
            {a.question}
            <span className="text-stone-400 transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-2 text-sm text-stone-600">{a.answer}</p>
        </details>
      ))}
    </div>
  );
}
