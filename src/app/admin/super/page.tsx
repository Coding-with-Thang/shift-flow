import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/rbac";
import { SuperAdminTenantsPanel } from "./SuperAdminTenantsPanel";

export default async function SuperAdminTenantsPage() {
  const session = await getSession();
  // Logged-in users must be super admins; anonymous visitors may use DB session bypass (see session.ts).
  if (session && !isSuperAdmin(session.role)) {
    redirect("/admin");
  }

  return <SuperAdminTenantsPanel />;
}
