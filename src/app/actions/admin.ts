"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function setCompanyStatus(companyId: string, status: "VERIFIED" | "REJECTED"): Promise<void> {
  await requireAdmin();
  await db.company.update({ where: { id: companyId }, data: { status } });
  revalidatePath("/admin");
}
