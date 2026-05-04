import { redirectIfMustChangePassword } from "@/lib/auth/password-policy";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await redirectIfMustChangePassword();
  return <AdminShell>{children}</AdminShell>;
}
