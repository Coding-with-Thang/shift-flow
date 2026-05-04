-- Supports tenant-scoped audit queries filtered by action and ordered by time.
CREATE INDEX IF NOT EXISTS "AuditEvent_tenantId_action_createdAt_idx" ON "AuditEvent" ("tenantId", "action", "createdAt");
