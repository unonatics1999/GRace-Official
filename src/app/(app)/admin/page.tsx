import { setCompanyStatus } from "@/app/actions/admin";
import { CompanyStatusBadge, EmptyState } from "@/components/ui";
import { displayDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function AdminPage() {
  await requireAdmin();
  const companies = await db.company.findMany({
    include: {
      users: { where: { role: "OWNER" }, take: 1 },
      _count: { select: { vehicles: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const pending = companies.filter((c) => c.status === "PENDING");
  const reviewed = companies.filter((c) => c.status !== "PENDING");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Verification queue</h1>
        <p className="mt-1 text-stone-500">
          Check each company&apos;s registration and insurance before approving. Verified companies can list and book.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Waiting for review ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState>Nothing to review.</EmptyState>
        ) : (
          pending.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-stone-500">
                  {c.city} · signed up {displayDay(c.createdAt)} · owner {c.users[0]?.email ?? "—"} ·{" "}
                  {c._count.vehicles} vehicle(s)
                </p>
              </div>
              <div className="flex gap-2">
                <form action={setCompanyStatus.bind(null, c.id, "REJECTED")}>
                  <button className="btn-danger">Reject</button>
                </form>
                <form action={setCompanyStatus.bind(null, c.id, "VERIFIED")}>
                  <button className="btn-primary">Verify</button>
                </form>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Reviewed</h2>
        <div className="card divide-y divide-stone-100 p-0">
          {reviewed.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <span>
                <span className="font-medium">{c.name}</span>
                <span className="text-stone-500"> · {c.city}</span>
              </span>
              <CompanyStatusBadge status={c.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
