import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { serializeTicketPublic } from "@/lib/tickets/serialize";
import { resolveTenantListScope } from "@/lib/tenant-scope";

const baseInclude = {
  requestor: { select: { id: true, publicAlias: true, username: true } },
  claimer: { select: { id: true, publicAlias: true, username: true } },
  tenant: { select: { tenantCode: true, name: true } },
} as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const scope = await resolveTenantListScope(session, url.searchParams.get("tenantId"));
  if ("error" in scope) return scope.error;

  const tenantWhere =
    "tenantId" in scope.tenantFilter ? { tenantId: scope.tenantFilter.tenantId } : {};

  const ticket = await prisma.shiftTicket.findFirst({
    where: { id, ...tenantWhere },
    include: baseInclude,
  });

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ticket: {
      ...serializeTicketPublic(ticket),
      isMine: ticket.requestorId === session.sub,
    },
  });
}
