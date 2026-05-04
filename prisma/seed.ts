import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { loginEmailForTenantUser } from "../src/lib/auth/login-email";
import { createServiceRoleClient, upsertAuthPasswordUser } from "../src/lib/supabase/service-role";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const prisma = new PrismaClient();

async function linkAuthUser(tenantCode: string, tenantId: string, username: string, plainPassword: string) {
  const admin = createServiceRoleClient();
  const email = loginEmailForTenantUser(tenantCode, username);
  const row = await prisma.user.findUnique({
    where: { tenantId_username: { tenantId, username } },
  });
  if (!row) throw new Error(`Missing seeded user: ${username}`);
  const authId = await upsertAuthPasswordUser(admin, email, plainPassword, {
    prisma_user_id: row.id,
    tenant_code: tenantCode,
    username: row.username,
  });
  await prisma.user.update({
    where: { id: row.id },
    data: { authUserId: authId, passwordHash: null, mustChangePassword: false },
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run seed");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to link users to Supabase Auth");
  }

  const tenant = await prisma.tenant.upsert({
    where: { tenantCode: "demo" },
    create: { name: "Demo Call Center", tenantCode: "demo" },
    update: {},
  });

  const opsPass = "ChangeMeOps!23";
  const leaderPass = "ChangeMeLeader!23";
  const agentPass = "ChangeMeAgent!23";

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: "ops" } },
    create: {
      tenantId: tenant.id,
      username: "ops",
      publicAlias: "Ops One",
      role: "OPS_MANAGER",
      passwordHash: null,
      authUserId: null,
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
      passwordHash: null,
      authUserId: null,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: "agent1" } },
    create: {
      tenantId: tenant.id,
      username: "agent1",
      publicAlias: "Agent One",
      role: "AGENT",
      passwordHash: null,
      authUserId: null,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: "agent2" } },
    create: {
      tenantId: tenant.id,
      username: "agent2",
      publicAlias: "Agent Two",
      role: "AGENT",
      passwordHash: null,
      authUserId: null,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: "agent3" } },
    create: {
      tenantId: tenant.id,
      username: "agent3",
      publicAlias: "Agent Three",
      role: "AGENT",
      passwordHash: null,
      authUserId: null,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: "agent4" } },
    create: {
      tenantId: tenant.id,
      username: "agent4",
      publicAlias: "Agent Four",
      role: "AGENT",
      passwordHash: null,
      authUserId: null,
    },
    update: {},
  });

  const tc = tenant.tenantCode;
  await linkAuthUser(tc, tenant.id, "ops", opsPass);
  await linkAuthUser(tc, tenant.id, "leader", leaderPass);
  await linkAuthUser(tc, tenant.id, "agent1", agentPass);
  await linkAuthUser(tc, tenant.id, "agent2", agentPass);
  await linkAuthUser(tc, tenant.id, "agent3", agentPass);
  await linkAuthUser(tc, tenant.id, "agent4", agentPass);

  console.log("Seed OK — tenantCode: demo (Supabase Auth)");
  console.log("Sign in: tenant code + username + password (same as before)");
  console.log("ops /", opsPass);
  console.log("leader /", leaderPass);
  console.log("agent1..agent4 /", agentPass);
}

function isDbUnreachable(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P1001"
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    if (isDbUnreachable(e)) {
      console.error(`
Could not connect to Postgres (P1001). Common fixes:
  • Supabase Dashboard → restore or resume the project if it is paused.
  • Settings → Database → copy the "Session pooler" connection string (port 6543) if direct port 5432 is blocked on your network.
  • For the direct host (port 5432), append ?sslmode=require to DATABASE_URL if missing.
`);
    }
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
