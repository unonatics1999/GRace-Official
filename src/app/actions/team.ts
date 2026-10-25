"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCompanyUser } from "@/lib/session";
import { canManageTeam, firstError, normalizeEmail, type ActionState } from "@/lib/util";

const memberSchema = z.object({
  name: z.string().trim().min(2, "Enter their name."),
  email: z.string().trim().email("Enter a valid email."),
  role: z.enum(["OWNER", "FLEET_MANAGER", "DRIVER"], { message: "Pick a role." }),
  password: z.string().min(8, "The temporary password needs at least 8 characters."),
});

export async function addMember(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireCompanyUser();
  if (!canManageTeam(me.role)) return { error: "Only an owner can add team members." };

  const parsed = memberSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const email = normalizeEmail(parsed.data.email);

  if (await db.user.findUnique({ where: { email } })) {
    return { error: "That email already has a GRace account." };
  }
  await db.user.create({
    data: {
      email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      companyId: me.companyId,
    },
  });
  revalidatePath("/team");
  return { ok: `Added ${parsed.data.name}. Share the temporary password with them directly.` };
}

export async function removeMember(userId: string): Promise<void> {
  const me = await requireCompanyUser();
  if (!canManageTeam(me.role) || userId === me.id) return;

  const member = await db.user.findFirst({ where: { id: userId, companyId: me.companyId } });
  if (!member) return;
  // Members who requested bookings stay, so the booking history keeps its requester.
  const requested = await db.booking.count({ where: { requestedById: member.id } });
  if (requested > 0) return;

  await db.user.delete({ where: { id: member.id } });
  revalidatePath("/team");
}
