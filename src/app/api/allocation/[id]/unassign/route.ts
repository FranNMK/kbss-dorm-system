/**
 * PATCH /api/allocation/[id]/unassign
 *
 * Closes an active allocation (FR-13):
 * - Sets endDate = today on the BedsAssignment row
 * - Sets Beds.isOccupied = false
 * - Does NOT delete the record — history is preserved
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

interface Params { params: { id: string } }

export async function PATCH(_req: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const assignId = Number(params.id);
  if (isNaN(assignId)) {
    return NextResponse.json({ error: "Invalid allocation ID" }, { status: 400 });
  }

  const assignment = await prisma.bedsAssignment.findUnique({
    where: { assignId },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Allocation not found" }, { status: 404 });
  }

  if (assignment.endDate !== null) {
    return NextResponse.json(
      { error: "This allocation is already closed" },
      { status: 409 }
    );
  }

  // Transaction: close allocation + free the bed
  const [updated] = await prisma.$transaction([
    prisma.bedsAssignment.update({
      where: { assignId },
      data: { endDate: new Date() },
      include: {
        student: { select: { stName: true, stAdmNo: true } },
        bed: { select: { bedNo: true, dormCode: true } },
      },
    }),
    prisma.bed.update({
      where: { bedNo: assignment.bedNo },
      data: { isOccupied: false },
    }),
  ]);

  return NextResponse.json(updated);
}
