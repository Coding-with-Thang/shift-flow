import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Creates or updates an Auth user with password and returns `auth.users.id`. */
export async function upsertAuthPasswordUser(
  admin: SupabaseClient,
  email: string,
  password: string,
  userMetadata: Record<string, unknown>,
): Promise<string> {
  const normalized = email.toLowerCase();
  const perPage = 200;

  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (found) {
      const { error: upErr } = await admin.auth.admin.updateUserById(found.id, {
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      });
      if (upErr) throw upErr;
      return found.id;
    }
    if (data.users.length < perPage) break;
  }

  const { data: created, error: crErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });
  if (crErr) throw crErr;
  if (!created.user) throw new Error("Supabase createUser returned no user");
  return created.user.id;
}

export async function setAuthUserPassword(admin: SupabaseClient, authUserId: string, password: string) {
  const { error } = await admin.auth.admin.updateUserById(authUserId, {
    password,
    email_confirm: true,
  });
  if (error) throw error;
}
