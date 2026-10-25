"use client";

import Link from "next/link";

/** Shown when a page throws. The digest lets support find the error in the server logs. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-sm text-red-600">Something went wrong</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">We couldn&apos;t load this page.</h1>
      <p className="mt-2 max-w-md text-stone-500">Try again. If it keeps happening, contact support{error.digest ? ` and mention code ${error.digest}` : ""}.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-secondary">Go home</Link>
      </div>
    </div>
  );
}
