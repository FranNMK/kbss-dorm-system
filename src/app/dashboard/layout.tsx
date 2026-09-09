import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSessionRole } from "@/lib/auth";
import { DashboardLayoutClient } from "@/components/layout/DashboardLayoutClient";
import { UserRole } from "@prisma/client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const role = await getSessionRole();

  if (role === UserRole.unassigned) {
    redirect("/dashboard/unauthorized");
  }

  return (
    <DashboardLayoutClient
      userEmail={session.email}
      userName={session.name}
      userRole={role}
    >
      {children}
    </DashboardLayoutClient>
  );
}
