/**
 * DELETE /api/students/bulk-delete
 *
 * Permanently deletes one or more students and ALL their related records:
 *   - BedsAssignment rows (and frees occupied beds)
 *   - DormSecretary rows
 *   - DormCleaner rows
 *   - Student rows
 *
 * AuditLog entries for these students are preserved (immutable audit trail).
 *
 * Body:  { stAdmNos: string[] }
 * Returns: { deleted: number }
 *
 * Role: admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, getSessionUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function DELETE(request: NextRequest) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  let body: { stAdmNos: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { stAdmNos } = body;

  if (!Array.isArray(stAdmNos) || stAdmNos.length === 0) {
    return NextResponse.json(
      { error: "stAdmNos must be a non-empty array" },
      { status: 400 }
    );
  }

  if (stAdmNos.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 students can be deleted at once" },
      { status: 400 }
    );
  }

  const user = await getSessionUser();

  const deleted = await prisma.$transaction(async (tx) => {
    // 1. Find which beds are currently occupied by these students (to free them)
    const occupiedAssignments = await tx.bedsAssignment.findMany({
      where: { stAdmNo: { in: stAdmNos }, endDate: null },
      select: { bedNo: true },
    });
    const occupiedBedNos = occupiedAssignments.map((a) => a.bedNo);

    // 2. Delete ALL bed assignment records for these students (history included)
    await tx.bedsAssignment.deleteMany({
      where: { stAdmNo: { in: stAdmNos } },
    });

    // 3. Free any beds that were occupied by deleted students
    if (occupiedBedNos.length > 0) {
      await tx.bed.updateMany({
        where: { bedNo: { in: occupiedBedNos } },
        data: { isOccupied: false },
      });
    }

    // 4. Delete dorm secretary roles
    await tx.dormSecretary.deleteMany({
      where: { stAdmNo: { in: stAdmNos } },
    });

    // 5. Delete dorm cleaner roles
    await tx.dormCleaner.deleteMany({
      where: { stAdmNo: { in: stAdmNos } },
    });

    // 6. Delete the student records themselves
    const result = await tx.student.deleteMany({
      where: { stAdmNo: { in: stAdmNos } },
    });

    // 7. Write audit log entry
    await tx.auditLog.create({
      data: {
        userId: user?.email ?? "unknown",
        action: "bulk_delete",
        targetTable: "Students",
        rowCount: result.count,
        details: {
          stAdmNos,
          freedBeds: occupiedBedNos,
        },
      },
    });

    return result.count;
  });

  return NextResponse.json({ deleted }, { status: 200 });
}
