/**
 * Dashboard layout — server component.
 *
 * - Checks Auth0 session; redirects to /auth/login if not authenticated.
 * - Extracts role from session; redirects to /dashboard/unauthorized if role = unassigned.
 * - Syncs the user record to the DB on every render (cheap upsert — idempotent).
 * - Passes session metadata to the client layout shell.
 */
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { getSessionRole } from "@/lib/auth";
import { DashboardLayoutClient } from "@/components/layout/DashboardLayoutClient";
import { UserRole } from "@prisma/client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const role = await getSessionRole();

  if (role === UserRole.unassigned) {
    redirect("/dashboard/unauthorized");
  }

  const { user } = session;

  return (
    <DashboardLayoutClient
      userEmail={user.email as string}
      userName={(user.name ?? user.email) as string}
      userRole={role}
    >
      {children}
    </DashboardLayoutClient>
  );
}
