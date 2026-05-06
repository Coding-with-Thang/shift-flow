-- CreateEnum
CREATE TYPE "ShiftTicketKind" AS ENUM ('GIVEAWAY', 'REQUEST');

-- AlterTable
ALTER TABLE "ShiftTicket" ADD COLUMN "kind" "ShiftTicketKind" NOT NULL DEFAULT 'GIVEAWAY';

-- CreateIndex
CREATE INDEX "ShiftTicket_tenantId_kind_status_idx" ON "ShiftTicket"("tenantId", "kind", "status");

