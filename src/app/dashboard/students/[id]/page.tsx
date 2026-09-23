import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import StudentForm from "@/components/students/StudentForm";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const student = await prisma.student.findUnique({
    where: { stAdmNo: decodeURIComponent(params.id) },
    select: { stName: true },
  });
  return {
    title: student
      ? `Edit ${student.stName} — Kigumo Bendera Dorms`
      : "Edit Student — Kigumo Bendera Dorms",
  };
}

export default async function EditStudentPage({ params }: Props) {
  const stAdmNo = decodeURIComponent(params.id);
  const role = await getSessionRole();

  const student = await prisma.student.findUnique({
    where: { stAdmNo },
    include: {
      year: { select: { yearId: true, label: true } },
      bedsAssignments: {
        where: { endDate: null },
        select: {
          assignId: true,
          startDate: true,
          bed: {
            select: {
              bedNo: true,
              dormCode: true,
              dorm: { select: { dName: true } },
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!student) notFound();

  const isAdmin = role === UserRole.admin;
  const isArchived = student.status === "archived";
  const currentBed = student.bedsAssignments[0]?.bed;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-neutral-text/50 mb-4">
        <Link href="/dashboard/students" className="hover:text-accent transition-colors">
          Students
        </Link>
        {" / "}
        <span>{student.stName}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-primary">{student.stName}</h1>
          <p className="text-xs text-neutral-text/50 font-mono mt-0.5">{student.stAdmNo}</p>
        </div>
        {isArchived && (
          <span className="bg-neutral-text/10 text-neutral-text/50 text-xs font-semibold px-3 py-1 rounded-sm uppercase">
            Archived
          </span>
        )}
      </div>

      {/* Current bed info (read-only) */}
      {currentBed && (
        <div className="border border-primary/15 bg-primary/5 rounded-sm px-4 py-3 mb-6 text-sm">
          <span className="font-medium text-primary">Current bed: </span>
          <span className="text-neutral-text/70">
            {currentBed.dorm.dName} — Bed {currentBed.bedNo}
          </span>
          <Link
            href="/dashboard/allocation"
            className="ml-3 text-xs text-primary underline hover:text-accent transition-colors"
          >
            Manage allocation →
          </Link>
        </div>
      )}

      {/* Archived warning for non-admins */}
      {isArchived && !isAdmin && (
        <div className="border border-amber-300 bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-sm mb-6">
          This student is archived. Contact an Admin to make changes.
        </div>
      )}

      <StudentForm
        mode="edit"
        defaultValues={{
          stAdmNo: student.stAdmNo,
          stName: student.stName,
          cClass: student.cClass,
          stream: student.stream,
          assessmentNo: student.assessmentNo ?? "",
          yearId: student.year.yearId,
        }}
      />
    </div>
  );
}
