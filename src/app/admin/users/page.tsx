import Link from "next/link";
import { AdminHeader, Table, Td } from "@/components/admin";
import { CompanyStatusBadge } from "@/components/ui";
import { ROLES, type Role } from "@/lib/constants";
import { displayDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const term = q?.trim().toLowerCase() || undefined;

  const users = await db.user.findMany({
    where: term ? { OR: [{ email: { contains: term } }, { name: { contains: term } }, { company: { name: { contains: term } } }] } : {},
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <AdminHeader title="Users" description="Everyone with a Downtime login.">
        <form className="flex flex-wrap gap-2">
          <Link href="/admin/users/new" className="btn-primary">+ New user</Link>
          <input name="q" defaultValue={q ?? ""} placeholder="Search name, email or company" className="input w-64" />
          <button className="btn-secondary">Search</button>
        </form>
      </AdminHeader>
      <Table head={["Name", "Email", "Company", "Role", "Joined"]} empty={users.length === 0}>
        {users.map((u) => (
          <tr key={u.id} className="hover:bg-stone-50/60">
            <Td>
              <Link href={`/admin/users/${u.id}`} className="font-medium text-brand-700 hover:underline">{u.name}</Link>
            </Td>
            <Td className="text-stone-600">{u.email}</Td>
            <Td>
              {u.company ? (
                <span className="flex items-center gap-2">
                  {u.company.name} <CompanyStatusBadge status={u.company.status} />
                </span>
              ) : (
                <span className="text-stone-400">—</span>
              )}
            </Td>
            <Td>{u.isAdmin ? <span className="badge bg-stone-900 text-white">Admin</span> : ROLES[u.role as Role]}</Td>
            <Td className="whitespace-nowrap text-stone-600">{displayDay(u.createdAt)}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
