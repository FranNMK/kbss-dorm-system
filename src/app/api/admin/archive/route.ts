/**
 * POST /api/admin/archive
 *
 * Soft-archives a filtered cohort of active students.
 *   - Sets status = archived, archivedAt = now()
 *   - Closes any open BedsAssignment (endDate = today) for affected students
 *   - Does NOT delete any records
 *   - Writes AuditLog in the same transaction
 *
 * Body: { class?, stream?, yearId?, stAdmNo?: string[] }
 * At least one filter is required (to avoid accidental mass archive).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, getSessionUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const body = await request.json();
  const { class: cClass, stream, yearId, stAdmNo } = body;

  // Require at least one filter
  if (!cClass && !stAdmNo?.length && !yearId) {
    return NextResponse.json(
      { error: "At least one filter (class, yearId, or stAdmNo) is required" },
      { status: 400 },
    );
  }

  const where = {
    status: "active" as const,
    ...(cClass && { cClass }),
    ...(stream && { stream }),
    ...(yearId && { yearId: Number(yearId) }),
    ...(stAdmNo?.length && { stAdmNo: { in: stAdmNo as string[] } }),
  };

  const user = await getSessionUser();
  const now = new Date();

  // Find affected students first (to close their bed allocations)
  const affected = await prisma.student.findMany({
    where,
    select: { stAdmNo: true },
  });
  const admNos = affected.map((s) => s.stAdmNo);

  const result = await prisma.$transaction(async (tx) => {
    // Close any open bed assignments for these students
    if (admNos.length > 0) {
      await tx.bedsAssignment.updateMany({
        where: { stAdmNo: { in: admNos }, endDate: null },
        data: { endDate: now },
      });
      // Free the beds
      const openAssignments = await tx.bedsAssignment.findMany({
        where: { stAdmNo: { in: admNos }, endDate: now },
        select: { bedNo: true },
      });
      if (openAssignments.length > 0) {
        await tx.bed.updateMany({
          where: { bedNo: { in: openAssignments.map((a) => a.bedNo) } },
          data: { isOccupied: false },
        });
      }
    }

    // Archive the students
    const updated = await tx.student.updateMany({
      where,
      data: { status: "archived", archivedAt: now },
    });

    // Write audit log
    await tx.auditLog.create({
      data: {
        userId: user?.email ?? "unknown",
        action: "archive",
        targetTable: "Students",
        rowCount: updated.count,
        details: { class: cClass, stream, yearId, stAdmNo },
      },
    });

    return updated;
  });

  return NextResponse.json({ archived: result.count });
}
