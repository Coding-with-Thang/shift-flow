import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/rbac";
import { normalizeTenantCode } from "@/lib/auth/login-email";

const createTenantSchema = z.object({
  name: z.string().min(1).max(128),
  tenantCode: z.string().min(1).max(64),
});

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, tenantCode: true, createdAt: true },
  });

  return NextResponse.json({ tenants });
}

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createTenantSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let normalizedCode: string;
  try {
    normalizedCode = normalizeTenantCode(parsed.data.tenantCode);
  } catch {
    return NextResponse.json({ error: "Invalid tenant code" }, { status: 400 });
  }

  const duplicate = await prisma.tenant.findUnique({ where: { tenantCode: normalizedCode } });
  if (duplicate) {
    return NextResponse.json({ error: "Tenant code already in use" }, { status: 409 });
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: parsed.data.name.trim(),
      tenantCode: normalizedCode,
    },
    select: { id: true, name: true, tenantCode: true, createdAt: true },
  });

  return NextResponse.json({ tenant });
}
