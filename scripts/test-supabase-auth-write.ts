import { createServiceRoleClient } from "@/lib/supabase/service-role";

function makeEmail() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `conn-test+${stamp}@example.com`;
}

function makePassword() {
  return `Test!${Math.random().toString(36).slice(2)}${Date.now()}`;
}

async function main() {
  const admin = createServiceRoleClient();
  const email = makeEmail();
  const password = makePassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { purpose: "connection-test" },
  });

  if (createErr) throw createErr;
  if (!created.user) throw new Error("Supabase createUser returned no user");

  const userId = created.user.id;

  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) throw deleteErr;

  // eslint-disable-next-line no-console
  console.log({
    ok: true,
    wrote_to_postgres_via_supabase_auth: true,
    created_then_deleted_user_id: userId,
    email,
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error({ ok: false, error: String(err), stack: err?.stack });
  process.exitCode = 1;
});

