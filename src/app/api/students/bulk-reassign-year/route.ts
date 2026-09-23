/**
 * POST /api/students/bulk-reassign-year
 *
 * Bulk-updates the yearId on a set of students.
 * Exactly one of `stAdmNos` (explicit list) or `filter` (dynamic query) must be provided.
 *
 * Body:
 *   {
 *     targetYearId: number;
 *     stAdmNos?: string[];                          // explicit checkbox selection
 *     filter?: {                                    // filter-based selection
 *       cClass?: string;
 *       stream?: string;
 *       yearId?: number;
 *       status?: "active" | "archived" | "all";
 *       search?: string;
 *     };
 *   }
 *
 * Returns: { updated: number; targetYear: { yearId, label } }
 *
 * Role: admin only.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, getSessionUser } from "@/lib/auth";
import { UserRole, StudentStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  let body: {
    targetYearId: number;
    stAdmNos?: string[];
    filter?: {
      cClass?: string;
      stream?: string;
      yearId?: number;
      status?: string;
      search?: string;
    };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { targetYearId, stAdmNos, filter } = body;

  // ── Validate exactly one of stAdmNos / filter ─────────────────────────
  if (typeof targetYearId !== "number") {
    return NextResponse.json({ error: "targetYearId is required and must be a number" }, { status: 400 });
  }

  const hasExplicit = Array.isArray(stAdmNos) && stAdmNos.length > 0;
  const hasFilter = filter !== undefined && filter !== null;

  if (!hasExplicit && !hasFilter) {
    return NextResponse.json(
      { error: "Provide either stAdmNos (array) or filter (object)" },
      { status: 400 }
    );
  }

  // ── Verify target year exists ─────────────────────────────────────────
  const targetYear = await prisma.academicYear.findUnique({ where: { yearId: targetYearId } });
  if (!targetYear) {
    return NextResponse.json({ error: `Academic year ${targetYearId} not found` }, { status: 404 });
  }

  // ── Build where clause ────────────────────────────────────────────────
  let where: Record<string, unknown> = {};

  if (hasExplicit) {
    where = { stAdmNo: { in: stAdmNos } };
  } else if (hasFilter) {
    const { cClass, stream, yearId, status, search } = filter!;

    if (status && status !== "all") {
      where.status =
        status === "archived" ? StudentStatus.archived : StudentStatus.active;
    }
    if (search) {
      where.OR = [
        { stAdmNo: { contains: search } },
        { stName: { contains: search } },
      ];
    }
    if (cClass) where.cClass = cClass;
    if (stream) where.stream = stream;
    if (yearId) where.yearId = Number(yearId);
  }

  // ── Perform bulk update ───────────────────────────────────────────────
  const user = await getSessionUser();

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.student.updateMany({
      where,
      data: { yearId: targetYearId },
    });

    await tx.auditLog.create({
      data: {
        userId: user?.email ?? "unknown",
        action: "bulk_reassign_year",
        targetTable: "Students",
        rowCount: updated.count,
        details: {
          targetYearId,
          targetYearLabel: targetYear.label,
          ...(hasExplicit ? { stAdmNos } : { filter }),
        },
      },
    });

    return updated.count;
  });

  return NextResponse.json(
    { updated: result, targetYear: { yearId: targetYearId, label: targetYear.label } },
    { status: 200 }
  );
}
