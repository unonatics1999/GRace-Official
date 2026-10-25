import { AdminHeader, Table, Td } from "@/components/admin";
import { AdminMessageForm } from "@/components/AdminMessageForm";
import { displayDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { emailConfigured, smsConfigured } from "@/lib/notify";
import { requireAdmin } from "@/lib/session";

const STATUS_STYLE: Record<string, string> = {
  SENT: "bg-emerald-100 text-emerald-800",
  SIMULATED: "bg-amber-100 text-amber-800",
  FAILED: "bg-red-100 text-red-800",
};

export default async function AdminMessages({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  await requireAdmin();
  const { to } = await searchParams;
  const [users, messages] = await Promise.all([
    db.user.findMany({ where: { isAdmin: false }, include: { company: true }, orderBy: { name: "asc" } }),
    db.message.findMany({ include: { toUser: true, sentBy: true }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const recipients = users.map((u) => ({ email: u.email, name: u.name, phone: u.company?.phone ?? "" }));
  const email = emailConfigured();
  const sms = smsConfigured();

  return (
    <>
      <AdminHeader title="Messages" description="Email or text any user. Every message, including password resets, is listed here." />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <AdminMessageForm recipients={recipients} initialTo={to ?? ""} />
          <div className="card space-y-2 text-sm">
            <p className="font-medium">Delivery</p>
            <Provider name="Email (Resend)" on={email} />
            <Provider name="Text message (Semaphore)" on={sms} />
            {!(email && sms) && (
              <p className="text-xs text-stone-500">
                Without a key, development simulates sending: the message is logged and marked Simulated. Add the keys in .env to send for real.
              </p>
            )}
          </div>
        </div>
        <Table head={["Sent", "To", "Channel", "Message", "Status"]} empty={messages.length === 0}>
          {messages.map((m) => (
            <tr key={m.id} className="align-top hover:bg-stone-50/60">
              <Td className="whitespace-nowrap text-stone-600">{displayDateTime(m.createdAt)}</Td>
              <Td>
                <p className="font-medium">{m.toUser.name}</p>
                <p className="text-xs text-stone-500">{m.address}</p>
              </Td>
              <Td className="whitespace-nowrap">
                {m.channel === "EMAIL" ? "Email" : "Text"}
                <p className="text-xs text-stone-500">{m.kind === "PASSWORD_RESET" ? "Password reset" : m.sentBy ? `by ${m.sentBy.name}` : ""}</p>
              </Td>
              <Td className="max-w-md">
                {m.subject && <p className="font-medium">{m.subject}</p>}
                {/* Reset messages contain a live link, so it isn't shown here. */}
                <p className="line-clamp-2 text-stone-600">{m.kind === "PASSWORD_RESET" ? "Reset link (hidden)" : m.body}</p>
              </Td>
              <Td>
                <span className={`badge ${STATUS_STYLE[m.status] ?? "bg-stone-100 text-stone-700"}`}>{m.status.toLowerCase()}</span>
                {m.error && <p className="mt-1 max-w-[16rem] text-xs text-red-700">{m.error}</p>}
              </Td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}

function Provider({ name, on }: { name: string; on: boolean }) {
  return (
    <p className="flex items-center justify-between">
      {name}
      <span className={`badge ${on ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{on ? "Connected" : "Simulated"}</span>
    </p>
  );
}
