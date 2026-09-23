/**
 * GET  /api/students  — list students with optional filters
 * POST /api/students  — create a new student
 *
 * Query params for GET:
 *   search   — partial match on stName or stAdmNo
 *   class    — exact match on cClass
 *   stream   — exact match on stream
 *   yearId   — filter by academic year ID
 *   status   — "active" | "archived" | "all"  (default: "active")
 *   page     — page number (default: 1)
 *   limit    — results per page (default: 50)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole, StudentStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? "";
  const cClass = searchParams.get("class") ?? "";
  const stream = searchParams.get("stream") ?? "";
  const yearId = searchParams.get("yearId");
  const statusParam = searchParams.get("status") ?? "active";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "50"));
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (statusParam !== "all") {
    where.status =
      statusParam === "archived" ? StudentStatus.archived : StudentStatus.active;
  }

  if (search) {
    where.OR = [
      { stAdmNo: { contains: search } },
      { stName: { contains: search } },
    ];
  }

  if (cClass) where.cClass = cClass;
  if (stream) where.stream = stream;
  if (yearId) where.yearId = parseInt(yearId);

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        year: { select: { label: true } },
        bedsAssignments: {
          where: { endDate: null },
          select: { bed: { select: { bedNo: true, dormCode: true } } },
          take: 1,
        },
      },
      orderBy: [{ cClass: "asc" }, { stream: "asc" }, { stName: "asc" }],
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
  ]);

  return NextResponse.json({ students, total, page, limit });
}

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const body = await request.json();
  const { stAdmNo, stName, cClass, stream, yearId, assessmentNo } = body;

  const CBC_CLASSES = new Set(["G10", "G11", "G12"]);
  const isCBC = CBC_CLASSES.has(cClass?.trim());
  // G10 assessment number is optional; only G11 and G12 require it
  const assessmentRequired = new Set(["G11", "G12"]).has(cClass?.trim());

  // Validate required fields
  if (!stAdmNo?.trim() || !stName?.trim() || !cClass?.trim() || !stream?.trim() || !yearId) {
    return NextResponse.json(
      { error: "stAdmNo, stName, cClass, stream, and yearId are required" },
      { status: 400 }
    );
  }

  if (assessmentRequired && !assessmentNo?.trim()) {
    return NextResponse.json(
      { error: "assessmentNo is required for G11 and G12" },
      { status: 400 }
    );
  }

  // Check for duplicate admission number
  const existing = await prisma.student.findUnique({
    where: { stAdmNo: stAdmNo.trim() },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Admission number ${stAdmNo} is already registered` },
      { status: 409 }
    );
  }

  // Check academic year exists
  const year = await prisma.academicYear.findUnique({ where: { yearId } });
  if (!year) {
    return NextResponse.json(
      { error: `Academic year ${yearId} not found` },
      { status: 400 }
    );
  }

  const student = await prisma.student.create({
    data: {
      stAdmNo: stAdmNo.trim(),
      stName: stName.trim(),
      cClass: cClass.trim(),
      stream: stream.trim(),
      assessmentNo: isCBC ? (assessmentNo?.trim() ?? null) : null,
      yearId,
    },
    include: { year: { select: { label: true } } },
  });

  return NextResponse.json(student, { status: 201 });
}
