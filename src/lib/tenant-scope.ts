import { NextResponse } from "next/server";
import type { SessionPayload } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/** Resolved tenant filter for list/detail queries. Empty object = all tenants (super admin only). */
export type TenantListFilter = Record<string, never> | { tenantId: string };

export async function resolveTenantListScope(
  session: SessionPayload,
  tenantIdParam: string | null,
): Promise<{ error: NextResponse } | { tenantFilter: TenantListFilter }> {
  if (session.role !== "SUPER_ADMIN") {
    return { tenantFilter: { tenantId: session.tenantId } };
  }
  if (!tenantIdParam || tenantIdParam.trim() === "") {
    return { tenantFilter: {} };
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantIdParam.trim() },
    select: { id: true },
  });
  if (!tenant) {
    return {
      error: NextResponse.json({ error: "Unknown tenant" }, { status: 400 }),
    };
  }
  return { tenantFilter: { tenantId: tenant.id } };
}
