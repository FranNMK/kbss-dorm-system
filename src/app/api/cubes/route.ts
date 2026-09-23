/**
 * GET  /api/cubes  — list cubes, optionally filtered by dormCode (paginated)
 * POST /api/cubes  — create a new cube
 *
 * Query params: dormCode, page (default 1), limit (default 50)
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
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "50"));
  const skip = (page - 1) * limit;

  const where = dormCode ? { dormCode } : undefined;

  const [cubes, total] = await Promise.all([
    prisma.cube.findMany({
      where,
      orderBy: [{ dormCode: "asc" }, { location: "asc" }],
      include: {
        dorm: { select: { dName: true } },
        _count: { select: { beds: true } },
      },
      skip,
      take: limit,
    }),
    prisma.cube.count({ where }),
  ]);

  return NextResponse.json({ cubes, total, page, limit });
}

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const body = await request.json();
  const { dormCode, location } = body;

  if (!dormCode?.trim() || !location?.trim()) {
    return NextResponse.json(
      { error: "dormCode and location are required" },
      { status: 400 }
    );
  }

  const dorm = await prisma.dorm.findUnique({ where: { dormCode: dormCode.trim() } });
  if (!dorm) {
    return NextResponse.json({ error: `Dorm "${dormCode}" not found` }, { status: 400 });
  }

  const cube = await prisma.cube.create({
    data: { dormCode: dormCode.trim(), location: location.trim() },
    include: { dorm: { select: { dName: true } } },
  });

  return NextResponse.json(cube, { status: 201 });
}
