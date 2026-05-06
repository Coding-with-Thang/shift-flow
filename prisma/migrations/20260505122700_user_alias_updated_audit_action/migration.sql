-- Add audit action for agent alias updates
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_ALIAS_UPDATED';

