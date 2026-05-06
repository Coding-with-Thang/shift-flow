/** Synthetic email for Supabase Auth; stable per tenant + user login id (`User.username`). */
const DEFAULT_DOMAIN = "scheduler.local";

/** Normalizes a tenant code for storage and sign-in (lowercase slug). */
export function normalizeTenantCode(label: string): string {
  return slugSegment(label, "tenant");
}

function slugSegment(label: string, kind: "tenant" | "username"): string {
  const t = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!t) {
    throw new Error(`${kind === "tenant" ? "Tenant code" : "Username"} must contain letters or numbers`);
  }
  return t;
}

export function loginEmailForTenantUser(tenantCode: string, username: string): string {
  const domain = process.env.AUTH_EMAIL_DOMAIN?.trim() || DEFAULT_DOMAIN;
  const local = slugSegment(username, "username");
  const tenant = normalizeTenantCode(tenantCode);
  return `${local}@${tenant}.${domain}`;
}
