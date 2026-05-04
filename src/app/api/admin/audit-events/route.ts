import { NextResponse } from "next/server";
import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canViewAnalytics } from "@/lib/rbac";
import { resolveTenantListScope } from "@/lib/tenant-scope";

const AUDIT_ACTIONS = new Set<string>(Object.values(AuditAction));
const MAX_TAKE = 100;
const DEFAULT_TAKE = 50;

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), i: id }), "utf8").toString("base64url");
}

function decodeCursor(raw: string): { t: string; i: string } | null {
  try {
    const json = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
    if (!json || typeof json !== "object") return null;
    const o = json as Record<string, unknown>;
    if (typeof o.t !== "string" || typeof o.i !== "string") return null;
    return { t: o.t, i: o.i };
  } catch {
    return null;
  }
}

function parseIsoDate(raw: string | null, label: string): NextResponse | Date | null {
  if (!raw || raw.trim() === "") return null;
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) {
    return NextResponse.json({ error: `Invalid ${label} date` }, { status: 400 });
  }
  return d;
}

export async function GET(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewAnalytics(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const scope = await resolveTenantListScope(session, url.searchParams.get("tenantId"));
  if ("error" in scope) return scope.error;

  const takeRaw = Number(url.searchParams.get("take") ?? String(DEFAULT_TAKE));
  const take = Number.isFinite(takeRaw) ? Math.min(MAX_TAKE, Math.max(1, Math.floor(takeRaw))) : DEFAULT_TAKE;

  const sortRaw = (url.searchParams.get("sort") ?? "desc").toLowerCase();
  const sort = sortRaw === "asc" ? "asc" : "desc";

  const actionRaw = url.searchParams.get("action")?.trim() ?? "";
  if (actionRaw && !AUDIT_ACTIONS.has(actionRaw)) {
    return NextResponse.json({ error: "Invalid action filter" }, { status: 400 });
  }

  const entityType = url.searchParams.get("entityType")?.trim() ?? "";
  const entityId = url.searchParams.get("entityId")?.trim() ?? "";
  const actorUsername = url.searchParams.get("actorUsername")?.trim() ?? "";

  const createdAfter = parseIsoDate(url.searchParams.get("createdAfter"), "createdAfter");
  if (createdAfter instanceof NextResponse) return createdAfter;
  const createdBefore = parseIsoDate(url.searchParams.get("createdBefore"), "createdBefore");
  if (createdBefore instanceof NextResponse) return createdBefore;

  if (createdAfter && createdBefore && createdAfter.getTime() > createdBefore.getTime()) {
    return NextResponse.json({ error: "createdAfter must be before or equal to createdBefore" }, { status: 400 });
  }

  const includePayload = url.searchParams.get("includePayload") === "1";

  const cursorRaw = url.searchParams.get("cursor")?.trim() ?? "";
  const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
  if (cursorRaw && !cursor) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  const tenantWhere: Prisma.AuditEventWhereInput =
    "tenantId" in scope.tenantFilter ? { tenantId: scope.tenantFilter.tenantId } : {};

  const filterWhere: Prisma.AuditEventWhereInput = {
    ...tenantWhere,
    ...(actionRaw ? { action: actionRaw as AuditAction } : {}),
    ...(entityType ? { entityType } : {}),
    ...(entityId
      ? {
          entityId: entityId.length >= 18 ? { equals: entityId } : { startsWith: entityId },
        }
      : {}),
    ...(actorUsername
      ? { actor: { username: { contains: actorUsername, mode: Prisma.QueryMode.insensitive } } }
      : {}),
    ...((createdAfter ?? createdBefore)
      ? {
          createdAt: {
            ...(createdAfter ? { gte: createdAfter } : {}),
            ...(createdBefore ? { lte: createdBefore } : {}),
          },
        }
      : {}),
  };

  const cursorWhere: Prisma.AuditEventWhereInput | undefined = cursor
    ? sort === "desc"
      ? {
          OR: [
            { createdAt: { lt: new Date(cursor.t) } },
            {
              AND: [{ createdAt: { equals: new Date(cursor.t) } }, { id: { lt: cursor.i } }],
            },
          ],
        }
      : {
          OR: [
            { createdAt: { gt: new Date(cursor.t) } },
            {
              AND: [{ createdAt: { equals: new Date(cursor.t) } }, { id: { gt: cursor.i } }],
            },
          ],
        }
    : undefined;

  const where: Prisma.AuditEventWhereInput = cursorWhere ? { AND: [filterWhere, cursorWhere] } : filterWhere;

  const orderBy: Prisma.AuditEventOrderByWithRelationInput[] =
    sort === "desc" ? [{ createdAt: "desc" }, { id: "desc" }] : [{ createdAt: "asc" }, { id: "asc" }];

  const select = {
    id: true,
    createdAt: true,
    action: true,
    entityType: true,
    entityId: true,
    ...(includePayload ? { payload: true } : {}),
    tenant: { select: { tenantCode: true, name: true } },
    actor: { select: { username: true, publicAlias: true, role: true } },
  } satisfies Prisma.AuditEventSelect;

  const rows = await prisma.auditEvent.findMany({
    where,
    orderBy,
    take: take + 1,
    select,
  });

  const hasMore = rows.length > take;
  const slice = hasMore ? rows.slice(0, take) : rows;
  const last = slice[slice.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

  return NextResponse.json({
    events: slice.map((e) => ({
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      tenantCode: e.tenant.tenantCode,
      tenantName: e.tenant.name,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      actorUsername: e.actor.username,
      actorAlias: e.actor.publicAlias,
      actorRole: e.actor.role,
      payload: includePayload ? (e as { payload: unknown }).payload : null,
    })),
    nextCursor,
    hasMore,
    take,
    sort,
  });
}
