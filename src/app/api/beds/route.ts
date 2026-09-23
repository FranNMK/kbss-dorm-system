/**
 * GET  /api/beds  — list beds with optional filters
 * POST /api/beds  — create a new bed
 *
 * Query params: dormCode, cubeId, status (ok|needs_repair), occupied (true|false)
 *
 * FR-11: cube MUST belong to the same dorm as the bed.
 * This is enforced here in the API; the schema @@index aids the validation query.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole, BedStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const dormCode = sp.get("dormCode");
  const cubeId = sp.get("cubeId");
  const statusParam = sp.get("status");
  const occupiedParam = sp.get("occupied");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "50"));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (dormCode) where.dormCode = dormCode;
  if (cubeId) where.cubeId = Number(cubeId);
  if (statusParam === "ok") where.bedStatus = BedStatus.ok;
  if (statusParam === "needs_repair") where.bedStatus = BedStatus.needs_repair;
  if (occupiedParam === "true") where.isOccupied = true;
  if (occupiedParam === "false") where.isOccupied = false;

  const [beds, total] = await Promise.all([
    prisma.bed.findMany({
      where,
      orderBy: [{ dormCode: "asc" }, { bedNo: "asc" }],
      include: {
        dorm: { select: { dName: true } },
        cube: { select: { location: true } },
      },
      skip,
      take: limit,
    }),
    prisma.bed.count({ where }),
  ]);

  return NextResponse.json({ beds, total, page, limit });
}

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const body = await request.json();
  const { bedNo, dormCode, cubeId, bedStatus } = body;

  if (!bedNo?.trim() || !dormCode?.trim() || !cubeId) {
    return NextResponse.json(
      { error: "bedNo, dormCode, and cubeId are required" },
      { status: 400 }
    );
  }

  // Check dorm exists
  const dorm = await prisma.dorm.findUnique({ where: { dormCode: dormCode.trim() } });
  if (!dorm) {
    return NextResponse.json({ error: `Dorm "${dormCode}" not found` }, { status: 400 });
  }

  // FR-11: Verify cube belongs to the same dorm
  const cube = await prisma.cube.findUnique({ where: { cubeId: Number(cubeId) } });
  if (!cube) {
    return NextResponse.json({ error: `Cube ${cubeId} not found` }, { status: 400 });
  }
  if (cube.dormCode !== dormCode.trim()) {
    return NextResponse.json(
      {
        error: `Cube ${cubeId} belongs to dorm "${cube.dormCode}", not "${dormCode}". A bed's cube must be in the same dorm.`,
      },
      { status: 422 }
    );
  }

  // Check duplicate bed number
  const existing = await prisma.bed.findUnique({ where: { bedNo: bedNo.trim() } });
  if (existing) {
    return NextResponse.json({ error: `Bed "${bedNo}" already exists` }, { status: 409 });
  }

  const validStatus = bedStatus === "needs_repair" ? BedStatus.needs_repair : BedStatus.ok;

  const bed = await prisma.bed.create({
    data: {
      bedNo: bedNo.trim(),
      dormCode: dormCode.trim(),
      cubeId: Number(cubeId),
      bedStatus: validStatus,
      isOccupied: false,
    },
    include: {
      dorm: { select: { dName: true } },
      cube: { select: { location: true } },
    },
  });

  return NextResponse.json(bed, { status: 201 });
}
