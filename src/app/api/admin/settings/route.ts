import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { canApprove } from "@/lib/rbac";

const updateSchema = z.object({
  operatingHoursStart: z.number().int().min(0).max(95).nullable(),
  operatingHoursEnd: z.number().int().min(1).max(96).nullable(),
});

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canApprove(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: {
      operatingHoursStart: true,
      operatingHoursEnd: true,
    },
  });

  return NextResponse.json({ settings: tenant });
}

export async function PATCH(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "OPS_MANAGER" && session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Operations Admin or Super Admin only" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { operatingHoursStart, operatingHoursEnd } = parsed.data;

  // Validate range if both are provided
  if (operatingHoursStart !== null && operatingHoursEnd !== null) {
    if (operatingHoursStart >= operatingHoursEnd) {
      return NextResponse.json({ error: "Start hour must be before end hour" }, { status: 400 });
    }
  }

  const tenant = await prisma.tenant.update({
    where: { id: session.tenantId },
    data: {
      operatingHoursStart,
      operatingHoursEnd,
    },
  });

  return NextResponse.json({ 
    success: true, 
    settings: {
      operatingHoursStart: tenant.operatingHoursStart,
      operatingHoursEnd: tenant.operatingHoursEnd
    } 
  });
}
