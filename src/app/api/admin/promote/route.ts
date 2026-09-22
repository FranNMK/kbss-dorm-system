/**
 * POST /api/admin/promote
 *
 * Bulk-advances C_Class for a filtered cohort of active students.
 * Promotion map:
 *   F3 → F4
 *   F4 → (graduated — returns warning, requires confirmGraduated=true to proceed)
 *   G10 → G11
 *   G11 → G12
 *   G12 → (graduated — returns warning, requires confirmGraduated=true to proceed)
 *
 * Body: { class, stream?, yearId?, stAdmNo?: string[], confirmGraduated?: boolean }
 * Writes an AuditLog row in the same transaction.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, getSessionUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";

const NEXT_CLASS: Record<string, string | null> = {
  F3: "F4",
  F4: null, // graduation
  G10: "G11",
  G11: "G12",
  G12: null, // graduation
};

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const body = await request.json();
  const { class: cClass, stream, yearId, stAdmNo, confirmGraduated = false } = body;

  if (!cClass) {
    return NextResponse.json({ error: "class is required" }, { status: 400 });
  }

  const nextClass = NEXT_CLASS[cClass];

  // If promoting a graduating class, require explicit confirmation
  if (nextClass === null && !confirmGraduated) {
    return NextResponse.json(
      {
        warning: true,
        message: `Students in ${cClass} are at the final year. Promoting will mark them for archiving. Pass confirmGraduated=true to archive them.`,
      },
      { status: 200 },
    );
  }

  const where = {
    status: "active" as const,
    cClass,
    ...(stream && { stream }),
    ...(yearId && { yearId: Number(yearId) }),
    ...(stAdmNo?.length && { stAdmNo: { in: stAdmNo as string[] } }),
  };

  const user = await getSessionUser();

  if (nextClass === null) {
    // Graduate: archive these students
    const result = await prisma.$transaction([
      prisma.student.updateMany({
        where,
        data: { status: "archived", archivedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          userId: user?.email ?? "unknown",
          action: "promote_graduate",
          targetTable: "Students",
          rowCount: 0, // will be overwritten below
          details: { class: cClass, stream, yearId, note: "Promoted to graduation → archived" },
        },
      }),
    ]);
    const count = result[0].count;
    await prisma.auditLog.updateMany({
      where: { action: "promote_graduate", userId: user?.email ?? "unknown" },
      data: { rowCount: count },
    });
    return NextResponse.json({ promoted: count, archived: true });
  }

  // Normal promote
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.student.updateMany({ where, data: { cClass: nextClass } });
    await tx.auditLog.create({
      data: {
        userId: user?.email ?? "unknown",
        action: "promote",
        targetTable: "Students",
        rowCount: updated.count,
        details: { from: cClass, to: nextClass, stream, yearId },
      },
    });
    return updated;
  });

  return NextResponse.json({ promoted: result.count, from: cClass, to: nextClass });
}
