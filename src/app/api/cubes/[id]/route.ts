/**
 * GET   /api/cubes/[id]  — fetch a single cube
 * PATCH /api/cubes/[id]  — update a cube
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const cube = await prisma.cube.findUnique({
    where: { cubeId: Number(params.id) },
    include: {
      dorm: { select: { dName: true, dormCode: true } },
      _count: { select: { beds: true } },
    },
  });

  if (!cube) return NextResponse.json({ error: "Cube not found" }, { status: 404 });
  return NextResponse.json(cube);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const cube = await prisma.cube.findUnique({ where: { cubeId: Number(params.id) } });
  if (!cube) return NextResponse.json({ error: "Cube not found" }, { status: 404 });

  const body = await request.json();
  const { location } = body;

  if (location !== undefined && !location?.trim()) {
    return NextResponse.json({ error: "location cannot be empty" }, { status: 400 });
  }

  const updated = await prisma.cube.update({
    where: { cubeId: Number(params.id) },
    data: { ...(location?.trim() && { location: location.trim() }) },
    include: { dorm: { select: { dName: true } } },
  });

  return NextResponse.json(updated);
}
