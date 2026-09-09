/**
 * GET   /api/beds/[id]  — fetch a single bed
 * PATCH /api/beds/[id]  — update bed (status only; isOccupied is read-only)
 *
 * FR-11: cube-dorm consistency re-checked on any dormCode/cubeId change.
 * isOccupied is NOT patchable here — it is managed by the allocation module.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole, BedStatus } from "@prisma/client";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const bed = await prisma.bed.findUnique({
    where: { bedNo: params.id },
    include: {
      dorm: { select: { dName: true, dormCode: true } },
      cube: { select: { location: true, cubeId: true } },
    },
  });

  if (!bed) return NextResponse.json({ error: "Bed not found" }, { status: 404 });
  return NextResponse.json(bed);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const bed = await prisma.bed.findUnique({ where: { bedNo: params.id } });
  if (!bed) return NextResponse.json({ error: "Bed not found" }, { status: 404 });

  const body = await request.json();
  const { dormCode, cubeId, bedStatus } = body;

  // isOccupied cannot be patched directly
  if ("isOccupied" in body) {
    return NextResponse.json(
      { error: "isOccupied is managed by the allocation module and cannot be set directly" },
      { status: 400 }
    );
  }

  const newDormCode = dormCode?.trim() ?? bed.dormCode;
  const newCubeId = cubeId !== undefined ? Number(cubeId) : bed.cubeId;

  // FR-11: Re-check cube-dorm consistency if either field is changing
  if (dormCode || cubeId !== undefined) {
    const cube = await prisma.cube.findUnique({ where: { cubeId: newCubeId } });
    if (!cube) {
      return NextResponse.json({ error: `Cube ${newCubeId} not found` }, { status: 400 });
    }
    if (cube.dormCode !== newDormCode) {
      return NextResponse.json(
        {
          error: `Cube ${newCubeId} belongs to dorm "${cube.dormCode}", not "${newDormCode}". A bed's cube must be in the same dorm.`,
        },
        { status: 422 }
      );
    }
  }

  let validStatus: BedStatus | undefined;
  if (bedStatus !== undefined) {
    validStatus = bedStatus === "needs_repair" ? BedStatus.needs_repair : BedStatus.ok;
  }

  const updated = await prisma.bed.update({
    where: { bedNo: params.id },
    data: {
      ...(dormCode?.trim() && { dormCode: dormCode.trim() }),
      ...(cubeId !== undefined && { cubeId: newCubeId }),
      ...(validStatus !== undefined && { bedStatus: validStatus }),
    },
    include: {
      dorm: { select: { dName: true } },
      cube: { select: { location: true } },
    },
  });

  return NextResponse.json(updated);
}
