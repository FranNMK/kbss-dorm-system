/**
 * POST /api/admin/demote
 *
 * Bulk-reverses C_Class for a filtered cohort of active students.
 * Demotion map:
 *   F4 → F3
 *   F3 → (already minimum — rejects)
 *   G12 → G11
 *   G11 → G10
 *   G10 → (already minimum — rejects)
 *
 * Body: { class, stream?, yearId?, stAdmNo?: string[] }
 * Writes an AuditLog row in the same transaction.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, getSessionUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";

const PREV_CLASS: Record<string, string | null> = {
  F4: "F3",
  F3: null, // cannot demote further
  G12: "G11",
  G11: "G10",
  G10: null, // cannot demote further
};

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const body = await request.json();
  const { class: cClass, stream, yearId, stAdmNo } = body;

  if (!cClass) {
    return NextResponse.json({ error: "class is required" }, { status: 400 });
  }

  const prevClass = PREV_CLASS[cClass];
  if (prevClass === null) {
    return NextResponse.json(
      { error: `${cClass} is already the minimum class. Cannot demote further.` },
      { status: 400 },
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

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.student.updateMany({ where, data: { cClass: prevClass } });
    await tx.auditLog.create({
      data: {
        userId: user?.email ?? "unknown",
        action: "demote",
        targetTable: "Students",
        rowCount: updated.count,
        details: { from: cClass, to: prevClass, stream, yearId },
      },
    });
    return updated;
  });

  return NextResponse.json({ demoted: result.count, from: cClass, to: prevClass });
}
