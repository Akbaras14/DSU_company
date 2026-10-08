import { Prisma, type Role } from "@prisma/client";
import { db, type Transaction } from "./db.js";

export async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  oldValue: unknown,
  newValue: unknown,
  description: string,
  tx: Transaction = db,
  role: Role = "ADMIN",
) {
  const json = (value: unknown) =>
    value == null
      ? Prisma.JsonNull
      : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
  await tx.auditLog.create({
    data: {
      actorId,
      role,
      action,
      entity,
      entityId,
      oldValue: json(oldValue),
      newValue: json(newValue),
      description,
    },
  });
}
