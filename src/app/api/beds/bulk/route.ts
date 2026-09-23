/**
 * POST /api/beds/bulk
 *
 * Creates multiple beds inside a single cube at once.
 * Bed numbers are auto-generated as: {prefix}-{padded sequence}
 * e.g. prefix "A", count 10 → A-001, A-002, … A-010
 * Sequence starts after the highest existing bed number in that cube to avoid collisions.
 *
 * Body:
 *   {
 *     dormCode: string;
 *     cubeId: number;
 *     count: number;       // 1–200
 *     prefix: string;      // e.g. "A" → A-001, A-002 …
 *   }
 *
 * Returns: { created: number; beds: Bed[] }
 *
 * Role: admin or dorm_master.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  let body: { dormCode: string; cubeId: number; count: number; prefix: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { dormCode, cubeId, count, prefix } = body;

  if (!dormCode?.trim()) {
    return NextResponse.json({ error: "dormCode is required" }, { status: 400 });
  }
  if (!Number.isInteger(cubeId) || cubeId < 1) {
    return NextResponse.json({ error: "cubeId must be a positive integer" }, { status: 400 });
  }
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    return NextResponse.json({ error: "count must be an integer between 1 and 200" }, { status: 400 });
  }
  if (!prefix?.trim()) {
    return NextResponse.json({ error: "prefix is required (e.g. A)" }, { status: 400 });
  }

  // Verify dorm exists
  const dorm = await prisma.dorm.findUnique({ where: { dormCode: dormCode.trim() } });
  if (!dorm) {
    return NextResponse.json({ error: `Dorm "${dormCode}" not found` }, { status: 400 });
  }

  // Verify cube exists and belongs to the same dorm (FR-11)
  const cube = await prisma.cube.findUnique({ where: { cubeId } });
  if (!cube) {
    return NextResponse.json({ error: `Cube #${cubeId} not found` }, { status: 400 });
  }
  if (cube.dormCode !== dormCode.trim()) {
    return NextResponse.json(
      { error: `Cube #${cubeId} does not belong to dorm "${dormCode}"` },
      { status: 422 }
    );
  }

  const bedPrefix = prefix.trim().toUpperCase();

  // Find how many beds with this prefix pattern already exist globally to guarantee uniqueness
  const existingBeds = await prisma.bed.findMany({
    where: { bedNo: { startsWith: `${bedPrefix}-` } },
    select: { bedNo: true },
  });

  // Parse the numeric part from existing bed numbers: prefix-NNN → NNN
  const usedNumbers = existingBeds
    .map((b) => {
      const parts = b.bedNo.split("-");
      const num = parseInt(parts[parts.length - 1]);
      return isNaN(num) ? 0 : num;
    });

  const startFrom = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;

  // Build bed numbers: prefix-001, prefix-002, …
  const bedNos = Array.from({ length: count }, (_, i) =>
    `${bedPrefix}-${String(startFrom + i).padStart(3, "0")}`
  );

  // Insert all beds
  await prisma.bed.createMany({
    data: bedNos.map((bedNo) => ({
      bedNo,
      dormCode: dormCode.trim(),
      cubeId,
      bedStatus: "ok",
      isOccupied: false,
    })),
    skipDuplicates: true,
  });

  // Return newly created beds
  const beds = await prisma.bed.findMany({
    where: { bedNo: { in: bedNos } },
    include: {
      dorm: { select: { dName: true } },
      cube: { select: { location: true } },
    },
    orderBy: { bedNo: "asc" },
  });

  return NextResponse.json({ created: beds.length, beds }, { status: 201 });
}
