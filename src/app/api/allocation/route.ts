/**
 * GET  /api/allocation  — list active allocations (endDate = null)
 * POST /api/allocation  — assign a student to a bed
 *
 * GET query params: dormCode, yearId, cClass
 *
 * FR-12: Rejects if bed is already occupied or student already has open allocation.
 * FR-13: Creates a new BedsAssignment row; never deletes old ones.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const dormCode = sp.get("dormCode");
  const yearId = sp.get("yearId");
  const cClass = sp.get("class");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "50"));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { endDate: null };

  const bedWhere: Record<string, unknown> = {};
  if (dormCode) bedWhere.dormCode = dormCode;

  const studentWhere: Record<string, unknown> = {};
  if (cClass) studentWhere.cClass = cClass;

  if (Object.keys(bedWhere).length) where.bed = { is: bedWhere };
  if (Object.keys(studentWhere).length) where.student = { is: studentWhere };
  if (yearId) where.yearId = Number(yearId);

  const [allocations, total] = await Promise.all([
    prisma.bedsAssignment.findMany({
      where,
      include: {
        student: { select: { stAdmNo: true, stName: true, cClass: true, stream: true } },
        bed: {
          select: {
            bedNo: true,
            dormCode: true,
            dorm: { select: { dName: true } },
            cube: { select: { location: true } },
          },
        },
        academicYear: { select: { label: true } },
      },
      orderBy: [{ bed: { dormCode: "asc" } }, { bed: { bedNo: "asc" } }],
      skip,
      take: limit,
    }),
    prisma.bedsAssignment.count({ where }),
  ]);

  return NextResponse.json({ allocations, total, page, limit });
}

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const body = await request.json();
  const { stAdmNo, bedNo, yearId } = body;

  if (!stAdmNo?.trim() || !bedNo?.trim() || !yearId) {
    return NextResponse.json(
      { error: "stAdmNo, bedNo, and yearId are required" },
      { status: 400 }
    );
  }

  // Check student exists and is active
  const student = await prisma.student.findUnique({ where: { stAdmNo: stAdmNo.trim() } });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  if (student.status === "archived") {
    return NextResponse.json({ error: "Cannot allocate an archived student" }, { status: 400 });
  }

  // Check bed exists
  const bed = await prisma.bed.findUnique({ where: { bedNo: bedNo.trim() } });
  if (!bed) {
    return NextResponse.json({ error: "Bed not found" }, { status: 404 });
  }

  // FR-12 — Bed must not be occupied
  if (bed.isOccupied) {
    return NextResponse.json(
      { error: `Bed ${bedNo} is already occupied. Un-assign it first.` },
      { status: 409 }
    );
  }

  // FR-12 — Student must not already have an open allocation this year
  const existingAllocation = await prisma.bedsAssignment.findFirst({
    where: { stAdmNo: stAdmNo.trim(), yearId: Number(yearId), endDate: null },
    include: { bed: { select: { bedNo: true, dormCode: true } } },
  });
  if (existingAllocation) {
    return NextResponse.json(
      {
        error: `${student.stName} is already assigned to bed ${existingAllocation.bed.bedNo} (${existingAllocation.bed.dormCode}) for this year. Un-assign first.`,
      },
      { status: 409 }
    );
  }

  // Run in a transaction: create assignment + mark bed occupied
  const [assignment] = await prisma.$transaction([
    prisma.bedsAssignment.create({
      data: {
        stAdmNo: stAdmNo.trim(),
        bedNo: bedNo.trim(),
        yearId: Number(yearId),
        startDate: new Date(),
        endDate: null,
      },
      include: {
        student: { select: { stName: true, cClass: true, stream: true } },
        bed: { select: { bedNo: true, dormCode: true, dorm: { select: { dName: true } } } },
        academicYear: { select: { label: true } },
      },
    }),
    prisma.bed.update({
      where: { bedNo: bedNo.trim() },
      data: { isOccupied: true },
    }),
  ]);

  return NextResponse.json(assignment, { status: 201 });
}
