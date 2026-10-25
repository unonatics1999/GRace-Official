import { db } from "./db";

/** Records who did what. Every admin action and money movement goes through here. */
export async function audit(actorId: string, action: string, targetType: string, targetId: string, details = ""): Promise<void> {
  await db.auditLog.create({ data: { actorId, action, targetType, targetId, details } });
}
