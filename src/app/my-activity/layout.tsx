import { redirectIfMustChangePassword } from "@/lib/auth/password-policy";

export default async function MyActivityLayout({ children }: { children: React.ReactNode }) {
  await redirectIfMustChangePassword();
  return <>{children}</>;
}
