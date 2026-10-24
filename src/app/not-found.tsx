import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <Logo className="text-lg" />
      <p className="mt-10 font-mono text-sm text-brand-600">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page is parked.</h1>
      <p className="mt-2 max-w-md text-stone-500">
        The page or listing you&apos;re looking for doesn&apos;t exist, or it&apos;s no longer available.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/explore" className="btn-primary">Explore vehicles</Link>
        <Link href="/" className="btn-secondary">Go home</Link>
      </div>
    </div>
  );
}
