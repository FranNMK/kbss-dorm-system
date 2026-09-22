/**
 * GET  /api/cleaners  — list active DormCleaners (with student + dorm)
 * POST /api/cleaners  — assign a student as a dorm cleaner
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const dormCode = sp.get("dormCode") || undefined;
  const yearId = sp.get("yearId") ? Number(sp.get("yearId")) : undefined;
  const showAll = sp.get("showAll") === "true";

  const data = await prisma.dormCleaner.findMany({
    where: {
      ...(showAll ? {} : { isActive: true }),
      ...(dormCode && { dormCode }),
      ...(yearId && { yearId }),
    },
    include: {
      student: { select: { stAdmNo: true, stName: true, cClass: true, stream: true } },
      dorm: { select: { dName: true } },
      academicYear: { select: { label: true } },
    },
    orderBy: [{ dormCode: "asc" }, { student: { stName: "asc" } }],
  });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const body = await request.json();
  const { stAdmNo, dormCode, yearId, areaAssigned } = body;

  if (!stAdmNo || !dormCode || !yearId || !areaAssigned?.trim()) {
    return NextResponse.json(
      { error: "stAdmNo, dormCode, yearId, and areaAssigned are required" },
      { status: 400 },
    );
  }

  // Enforce: one active cleaner assignment per student per year (schema @@unique)
  const duplicate = await prisma.dormCleaner.findFirst({
    where: { stAdmNo, yearId: Number(yearId), isActive: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "This student is already an active cleaner for this academic year." },
      { status: 409 },
    );
  }

  const record = await prisma.dormCleaner.create({
    data: {
      stAdmNo,
      dormCode,
      yearId: Number(yearId),
      areaAssigned: areaAssigned.trim(),
      isActive: true,
    },
    include: {
      student: { select: { stAdmNo: true, stName: true, cClass: true, stream: true } },
      dorm: { select: { dName: true } },
      academicYear: { select: { label: true } },
    },
  });

  return NextResponse.json(record, { status: 201 });
}
