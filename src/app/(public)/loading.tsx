import { PageSkeleton } from "@/components/PageSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageSkeleton />
    </div>
  );
}
