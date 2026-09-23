/**
 * GET  /api/dorms  — list all dorms (paginated)
 * POST /api/dorms  — create a new dorm
 *
 * Query params: page (default 1), limit (default 50)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "50"));
  const skip = (page - 1) * limit;

  const [dorms, total] = await Promise.all([
    prisma.dorm.findMany({
      orderBy: { dName: "asc" },
      include: { _count: { select: { beds: true, cubes: true } } },
      skip,
      take: limit,
    }),
    prisma.dorm.count(),
  ]);

  return NextResponse.json({ dorms, total, page, limit });
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
