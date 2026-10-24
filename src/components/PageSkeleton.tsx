/** Placeholder shown while a server page loads. */
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded-lg bg-stone-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-stone-200/70" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-stone-200/60" />
    </div>
  );
}
