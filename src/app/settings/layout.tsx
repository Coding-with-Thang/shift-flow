import { redirectIfMustChangePassword } from "@/lib/auth/password-policy";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await redirectIfMustChangePassword();
  return <>{children}</>;
}
