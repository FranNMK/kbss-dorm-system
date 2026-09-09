/**
 * GET  /api/academic-years  — list all academic years
 * POST /api/academic-years  — create a new academic year (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function GET() {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const years = await prisma.academicYear.findMany({
    orderBy: { yearId: "desc" },
  });

  return NextResponse.json(years);
}

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const body = await request.json();
  const { label, isCurrent } = body;

  if (!label?.trim()) {
    return NextResponse.json({ error: "label is required (e.g. 2024/2025)" }, { status: 400 });
  }

  // If marking as current, un-mark any existing current year first
  if (isCurrent) {
    await prisma.academicYear.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });
  }

  const year = await prisma.academicYear.create({
    data: { label: label.trim(), isCurrent: !!isCurrent },
  });

  return NextResponse.json(year, { status: 201 });
}
