import type { Metadata } from "next";
import Link from "next/link";
import StudentForm from "@/components/students/StudentForm";

export const metadata: Metadata = {
  title: "Add Student — Kigumo Bendera Dorms",
};

export default function NewStudentPage() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-neutral-text/50 mb-4">
        <Link href="/dashboard/students" className="hover:text-accent transition-colors">
          Students
        </Link>
        {" / "}
        <span>Add Student</span>
      </nav>

      <h1 className="text-xl font-bold text-primary mb-6">Add New Student</h1>

      <StudentForm mode="create" />
    </div>
  );
}
