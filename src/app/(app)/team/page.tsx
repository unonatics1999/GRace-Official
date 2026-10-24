import { addMember, removeMember } from "@/app/actions/team";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { ROLES, type Role } from "@/lib/constants";
import { db } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { canManageTeam } from "@/lib/util";

export default async function TeamPage() {
  const me = await requireCompanyUser();
  const members = await db.user.findMany({
    where: { companyId: me.companyId },
    include: { _count: { select: { bookingsRequested: true } } },
    orderBy: { createdAt: "asc" },
  });
  const isOwner = canManageTeam(me.role);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="space-y-4 lg:col-span-2">
        <h1 className="page-title">Team</h1>
        <div className="card divide-y divide-stone-100 p-0">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="font-medium">
                  {m.name} {m.id === me.id && <span className="text-xs text-stone-400">(you)</span>}
                </p>
                <p className="text-sm text-stone-500">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge bg-stone-100 text-stone-700">{ROLES[m.role as Role]}</span>
                {isOwner && m.id !== me.id && m._count.bookingsRequested === 0 && (
                  <form action={removeMember.bind(null, m.id)}>
                    <button className="text-xs text-red-600 hover:underline">Remove</button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-stone-500">
          Owners manage the team. Fleet managers list vehicles and handle bookings. Drivers can see bookings.
        </p>
      </section>

      {isOwner && (
        <section className="card h-fit">
          <h2 className="font-semibold">Add a team member</h2>
          <ActionForm action={addMember} submitLabel="Add member" className="mt-4 space-y-3">
            <Field label="Name" name="name" required />
            <Field label="Email" name="email" type="email" required />
            <label className="block">
              <span className="label">Role</span>
              <select name="role" className="input" defaultValue="FLEET_MANAGER">
                {Object.entries(ROLES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <Field label="Temporary password" name="password" type="text" required minLength={8} autoComplete="off" />
          </ActionForm>
        </section>
      )}
    </div>
  );
}
