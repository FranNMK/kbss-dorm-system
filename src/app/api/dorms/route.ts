/**
 * GET  /api/dorms  — list all dorms
 * POST /api/dorms  — create a new dorm
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function GET() {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const dorms = await prisma.dorm.findMany({
    orderBy: { dName: "asc" },
    include: {
      _count: { select: { beds: true, cubes: true } },
    },
  });

  return NextResponse.json(dorms);
}

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const body = await request.json();
  const { dormCode, dName, capacity, patron } = body;

  if (!dormCode?.trim() || !dName?.trim() || !capacity || !patron?.trim()) {
    return NextResponse.json(
      { error: "dormCode, dName, capacity, and patron are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.dorm.findUnique({ where: { dormCode: dormCode.trim() } });
  if (existing) {
    return NextResponse.json(
      { error: `Dorm code "${dormCode}" already exists` },
      { status: 409 }
    );
  }

  const dorm = await prisma.dorm.create({
    data: {
      dormCode: dormCode.trim().toUpperCase(),
      dName: dName.trim(),
      capacity: Number(capacity),
      patron: patron.trim(),
    },
  });

  return NextResponse.json(dorm, { status: 201 });
}
