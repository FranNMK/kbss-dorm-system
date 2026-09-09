/**
 * GET  /api/cubes  — list cubes, optionally filtered by dormCode
 * POST /api/cubes  — create a new cube
 *
 * Query params: dormCode
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const dormCode = request.nextUrl.searchParams.get("dormCode");

  const cubes = await prisma.cube.findMany({
    where: dormCode ? { dormCode } : undefined,
    orderBy: [{ dormCode: "asc" }, { location: "asc" }],
    include: {
      dorm: { select: { dName: true } },
      _count: { select: { beds: true } },
    },
  });

  return NextResponse.json(cubes);
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
