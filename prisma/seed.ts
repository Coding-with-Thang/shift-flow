import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Same resolution order as Next.js: base env, then `.env.local` overrides (e.g. Supabase DATABASE_URL).
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import { hashPassword, hashInviteCode } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run seed");
  }

  const tenant = await prisma.tenant.upsert({
    where: { tenantCode: "demo" },
    create: { name: "Demo Call Center", tenantCode: "demo" },
    update: {},
  });

  const opsPass = "ChangeMeOps!23";
  const leaderPass = "ChangeMeLeader!23";
  const agentPass = "ChangeMeAgent!23";
  const tempPass =
    process.env.SEED_TEMP_PASSWORD?.trim() && process.env.SEED_TEMP_PASSWORD.length >= 8
      ? process.env.SEED_TEMP_PASSWORD.trim()
      : "TempUser!123456";

  const superAdminPass =
    process.env.SEED_SUPER_ADMIN_PASSWORD?.trim() &&
    process.env.SEED_SUPER_ADMIN_PASSWORD.length >= 8
      ? process.env.SEED_SUPER_ADMIN_PASSWORD.trim()
      : "SuperAdmin!123456";

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: "ops" } },
    create: {
      tenantId: tenant.id,
      username: "ops",
      publicAlias: "Ops One",
      role: "OPS_MANAGER",
      passwordHash: await hashPassword(opsPass),
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: "leader" } },
    create: {
      tenantId: tenant.id,
      username: "leader",
      publicAlias: "Leader One",
      role: "LEADER",
      passwordHash: await hashPassword(leaderPass),
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: "agent" } },
    create: {
      tenantId: tenant.id,
      username: "agent",
      publicAlias: "Agent Apple",
      role: "AGENT",
      passwordHash: await hashPassword(agentPass),
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: "temp" } },
    create: {
      tenantId: tenant.id,
      username: "temp",
      publicAlias: "Temp User",
      role: "AGENT",
      passwordHash: await hashPassword(tempPass),
    },
    update: { passwordHash: await hashPassword(tempPass) },
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: "superadmin" } },
    create: {
      tenantId: tenant.id,
      username: "superadmin",
      publicAlias: "Super Admin",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      passwordHash: await hashPassword(superAdminPass),
    },
    update: { passwordHash: await hashPassword(superAdminPass), status: "ACTIVE" },
  });

  const inviteUser = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: "rook" } },
    create: {
      tenantId: tenant.id,
      username: "rook",
      publicAlias: "Agent Rook",
      role: "AGENT",
      passwordHash: await hashPassword(Math.random().toString(36)),
    },
    update: {},
  });

  await prisma.inviteCode.deleteMany({ where: { userId: inviteUser.id } });
  const plainInvite = "demo-invite-rook";
  await prisma.inviteCode.create({
    data: {
      tenantId: tenant.id,
      userId: inviteUser.id,
      codeHash: await hashInviteCode(plainInvite),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: "_system" } },
    create: {
      tenantId: tenant.id,
      username: "_system",
      publicAlias: "System",
      role: "SUPER_ADMIN",
      status: "DISABLED",
      passwordHash: await hashPassword(Math.random().toString(36)),
    },
    update: {},
  });

  console.log("Seed OK — tenantCode: demo");
  console.log("Sign in: tenantCode demo + username + password");
  console.log("temp /", tempPass, "(set SEED_TEMP_PASSWORD to customize)");
  console.log(
    "superadmin /",
    superAdminPass,
    "(SUPER_ADMIN; set SEED_SUPER_ADMIN_PASSWORD to customize)",
  );
  console.log("ops /", opsPass);
  console.log("leader /", leaderPass);
  console.log("agent /", agentPass);
  console.log("rook: register with invite:", plainInvite, "then set password");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
