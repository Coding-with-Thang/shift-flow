import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

/** Sends users who still owe a password change to `/account/change-password`. */
export async function redirectIfMustChangePassword() {
  const session = await getSession();
  if (!session) return;
  const row = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { mustChangePassword: true },
  });
  if (row?.mustChangePassword) {
    redirect("/account/change-password");
  }
}
