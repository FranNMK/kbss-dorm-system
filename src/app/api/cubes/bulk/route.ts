/**
 * POST /api/cubes/bulk
 *
 * Creates multiple cubes in a single dorm at once.
 *
 * Body:
 *   {
 *     dormCode: string;
 *     count: number;          // 1–100
 *     locationPrefix: string; // e.g. "Block A" → generates "Block A 1", "Block A 2", …
 *   }
 *
 * Returns: { created: number; cubes: Cube[] }
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

  let body: { dormCode: string; count: number; locationPrefix: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { dormCode, count, locationPrefix } = body;

  if (!dormCode?.trim()) {
    return NextResponse.json({ error: "dormCode is required" }, { status: 400 });
  }
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    return NextResponse.json({ error: "count must be an integer between 1 and 100" }, { status: 400 });
  }
  if (!locationPrefix?.trim()) {
    return NextResponse.json({ error: "locationPrefix is required (e.g. Block A)" }, { status: 400 });
  }

  // Verify dorm exists
  const dorm = await prisma.dorm.findUnique({ where: { dormCode: dormCode.trim() } });
  if (!dorm) {
    return NextResponse.json({ error: `Dorm "${dormCode}" not found` }, { status: 400 });
  }

  // Find how many cubes with this prefix already exist so numbering continues from there
  const prefix = locationPrefix.trim();
  const existingCount = await prisma.cube.count({
    where: { dormCode: dormCode.trim(), location: { startsWith: prefix } },
  });

  // Build insert data — numbered from (existingCount + 1)
  const data = Array.from({ length: count }, (_, i) => ({
    dormCode: dormCode.trim(),
    location: `${prefix} ${existingCount + i + 1}`,
  }));

  await prisma.cube.createMany({ data });

  // Return the newly created cubes
  const cubes = await prisma.cube.findMany({
    where: {
      dormCode: dormCode.trim(),
      location: { in: data.map((d) => d.location) },
    },
    include: { dorm: { select: { dName: true } }, _count: { select: { beds: true } } },
    orderBy: { cubeId: "asc" },
  });

  return NextResponse.json({ created: cubes.length, cubes }, { status: 201 });
}
