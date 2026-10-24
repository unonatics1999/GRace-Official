import { setCompanyStatus } from "@/app/actions/admin";
import { ActionButton, AdminHeader, FilterTabs, Table, Td } from "@/components/admin";
import { CompanyStatusBadge } from "@/components/ui";
import { COMPANY_STATUS } from "@/lib/constants";
import { displayDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function AdminCompanies({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = status && status in COMPANY_STATUS ? status : undefined;

  const [counts, companies] = await Promise.all([
    db.company.groupBy({ by: ["status"], _count: true }),
    db.company.findMany({
      where: filter ? { status: filter } : {},
      include: {
        users: { where: { role: "OWNER" }, take: 1 },
        _count: { select: { users: true, vehicles: true, bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const total = counts.reduce((n, c) => n + c._count, 0);

  return (
    <>
      <AdminHeader
        title="Companies"
        description="Check registration and insurance before verifying. Only verified companies can list and book."
      />
      <FilterTabs
        base="/admin/companies"
        current={filter}
        options={[
          { label: "All", count: total },
          ...Object.entries(COMPANY_STATUS).map(([value, label]) => ({ value, label, count: count(value) })),
        ]}
      />
      <Table head={["Company", "Owner", "Members", "Vehicles", "Rentals", "Joined", "Status", ""]} empty={companies.length === 0}>
        {companies.map((c) => (
          <tr key={c.id} className="hover:bg-stone-50/60">
            <Td>
              <p className="font-medium text-stone-900">{c.name}</p>
              <p className="text-xs text-stone-500">{c.city}</p>
            </Td>
            <Td className="text-stone-600">{c.users[0]?.email ?? "—"}</Td>
            <Td>{c._count.users}</Td>
            <Td>{c._count.vehicles}</Td>
            <Td>{c._count.bookings}</Td>
            <Td className="whitespace-nowrap text-stone-600">{displayDay(c.createdAt)}</Td>
            <Td><CompanyStatusBadge status={c.status} /></Td>
            <Td>
              <div className="flex justify-end gap-2">
                {c.status === "PENDING" && (
                  <>
                    <ActionButton action={setCompanyStatus.bind(null, c.id, "REJECTED")} label="Reject" tone="danger" />
                    <ActionButton action={setCompanyStatus.bind(null, c.id, "VERIFIED")} label="Verify" tone="primary" />
                  </>
                )}
                {c.status === "VERIFIED" && (
                  <ActionButton action={setCompanyStatus.bind(null, c.id, "SUSPENDED")} label="Suspend" tone="danger" />
                )}
                {(c.status === "SUSPENDED" || c.status === "REJECTED") && (
                  <ActionButton action={setCompanyStatus.bind(null, c.id, "VERIFIED")} label={c.status === "SUSPENDED" ? "Reinstate" : "Verify"} />
                )}
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
