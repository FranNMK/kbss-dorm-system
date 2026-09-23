import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getSessionRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import StudentsTable from "@/components/students/StudentsTable";

export const metadata: Metadata = {
  title: "Students — Kigumo Bendera Dorms",
};

export default async function StudentsPage() {
  const role = await getSessionRole();
  const isAdmin = role === UserRole.admin;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-primary">Students</h1>
          <p className="text-xs text-neutral-text/50 mt-0.5">
            Manage student records — upload in bulk, filter by class or stream, or add one at a time
          </p>
        </div>
        <Link
          href="/dashboard/students/new"
          className="bg-accent text-primary text-sm font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors whitespace-nowrap"
        >
          + Add Student
        </Link>
      </div>

      {/* Table / cards — Suspense required for useSearchParams inside StudentsTable */}
      <Suspense fallback={<div className="text-sm text-neutral-text/50 py-8 text-center">Loading students…</div>}>
        <StudentsTable isAdmin={isAdmin} />
      </Suspense>
    </div>
  );
}
