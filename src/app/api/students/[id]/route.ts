/**
 * GET   /api/students/[id]  — fetch a single student by stAdmNo
 * PATCH /api/students/[id]  — update a student record
 *
 * Note: "id" here is the stAdmNo (admission number string PK).
 * Archiving is handled by /api/admin/archive — not here.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const student = await prisma.student.findUnique({
    where: { stAdmNo: params.id },
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

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json(student);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const student = await prisma.student.findUnique({
    where: { stAdmNo: params.id },
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const body = await request.json();
  const { stName, cClass, stream, yearId } = body;

  // Validate any provided fields are non-empty strings
  if (stName !== undefined && !stName?.trim()) {
    return NextResponse.json({ error: "stName cannot be empty" }, { status: 400 });
  }
  if (cClass !== undefined && !cClass?.trim()) {
    return NextResponse.json({ error: "cClass cannot be empty" }, { status: 400 });
  }
  if (stream !== undefined && !stream?.trim()) {
    return NextResponse.json({ error: "stream cannot be empty" }, { status: 400 });
  }

  if (yearId !== undefined) {
    const year = await prisma.academicYear.findUnique({ where: { yearId } });
    if (!year) {
      return NextResponse.json({ error: `Academic year ${yearId} not found` }, { status: 400 });
    }
  }

  const updated = await prisma.student.update({
    where: { stAdmNo: params.id },
    data: {
      ...(stName !== undefined && { stName: stName.trim() }),
      ...(cClass !== undefined && { cClass: cClass.trim() }),
      ...(stream !== undefined && { stream: stream.trim() }),
      ...(yearId !== undefined && { yearId }),
    },
    include: { year: { select: { label: true } } },
  });

  return NextResponse.json(updated);
}
