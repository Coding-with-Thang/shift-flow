import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "./db";

type AuditInput = {
  tenantId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  actorId: string;
  payload: Prisma.InputJsonValue;
  shiftTicketId?: string | null;
};

export async function writeAudit(input: AuditInput) {
  return prisma.auditEvent.create({
    data: {
      tenantId: input.tenantId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId,
      payload: input.payload,
      shiftTicketId: input.shiftTicketId ?? undefined,
    },
  });
}
