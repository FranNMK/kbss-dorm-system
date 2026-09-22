import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export const metadata: Metadata = {
  title: "Admin — Kigumo Bendera Dorms",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getSessionRole();
  if (role !== UserRole.admin) {
    redirect("/dashboard/unauthorized");
  }
  return <>{children}</>;
}
