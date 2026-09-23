/**
 * GET  /api/secretaries  — list active DormSecretaries (with student + dorm)
 * POST /api/secretaries  — assign a student as secretary/assistant_secretary
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole, SecretaryRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const dormCode = sp.get("dormCode") || undefined;
  const yearId = sp.get("yearId") ? Number(sp.get("yearId")) : undefined;
  const showAll = sp.get("showAll") === "true";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "50"));
  const skip = (page - 1) * limit;

  const where = {
    ...(showAll ? {} : { isActive: true }),
    ...(dormCode && { dormCode }),
    ...(yearId && { yearId }),
  };

  const [data, total] = await Promise.all([
    prisma.dormSecretary.findMany({
      where,
      include: {
        student: { select: { stAdmNo: true, stName: true, cClass: true, stream: true } },
        dorm: { select: { dName: true } },
        academicYear: { select: { label: true } },
      },
      orderBy: [{ dormCode: "asc" }, { role: "asc" }],
      skip,
      take: limit,
    }),
    prisma.dormSecretary.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const body = await request.json();
  const { stAdmNo, dormCode, yearId, role } = body;

  if (!stAdmNo || !dormCode || !yearId || !role) {
    return NextResponse.json(
      { error: "stAdmNo, dormCode, yearId, and role are required" },
      { status: 400 },
    );
  }

  if (!Object.values(SecretaryRole).includes(role as SecretaryRole)) {
    return NextResponse.json(
      { error: "Invalid role. Must be 'secretary' or 'assistant_secretary'" },
      { status: 400 },
    );
  }

  // Enforce: one active secretary of each role type per dorm per year
  const existing = await prisma.dormSecretary.findFirst({
    where: { dormCode, yearId: Number(yearId), role: role as SecretaryRole, isActive: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: `This dorm already has an active ${role.replace("_", " ")} for this year. Remove them first.`,
      },
      { status: 409 },
    );
  }

  // Enforce: student cannot hold the same role in the same year (unique constraint)
  const duplicate = await prisma.dormSecretary.findFirst({
    where: { stAdmNo, yearId: Number(yearId), role: role as SecretaryRole },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "This student already holds this role in this academic year." },
      { status: 409 },
    );
  }

  const record = await prisma.dormSecretary.create({
    data: {
      stAdmNo,
      dormCode,
      yearId: Number(yearId),
      role: role as SecretaryRole,
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
