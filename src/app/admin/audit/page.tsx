import { AdminHeader, Table, Td } from "@/components/admin";
import { displayDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function AuditPage() {
  await requireAdmin();
  const entries = await db.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 300 });
  return (
    <>
      <AdminHeader title="Audit log" description="Every admin decision and money action, newest first. Entries can't be edited." />
      <Table head={["When", "Who", "Action", "Target", "Details"]} empty={entries.length === 0}>
        {entries.map((e) => (
          <tr key={e.id}>
            <Td className="whitespace-nowrap text-stone-600">{displayDateTime(e.createdAt)}</Td>
            <Td>{e.actor.name}</Td>
            <Td><code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">{e.action}</code></Td>
            <Td className="text-xs text-stone-500">{e.targetType} {e.targetId.slice(-8)}</Td>
            <Td className="max-w-xs truncate text-stone-600">{e.details}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
