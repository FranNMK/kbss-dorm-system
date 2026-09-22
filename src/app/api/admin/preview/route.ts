/**
 * GET /api/admin/preview
 *
 * Returns a preview (list + count) of students that would be affected
 * by a promote, demote, or archive operation, before confirmation.
 *
 * Query params:
 *   action  : "promote" | "demote" | "archive"
 *   class   : C_Class to filter (e.g. "F3", "G10")
 *   stream  : optional stream filter
 *   yearId  : optional yearId filter
 *   stAdmNo : optional comma-separated list of specific admission numbers (archive only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const action = sp.get("action");
  const cClass = sp.get("class") || undefined;
  const stream = sp.get("stream") || undefined;
  const yearId = sp.get("yearId") ? Number(sp.get("yearId")) : undefined;
  const admNos = sp.get("stAdmNo")
    ? sp.get("stAdmNo")!.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  // For archive: allow filtering by specific admission numbers
  const where =
    admNos && admNos.length > 0
      ? { stAdmNo: { in: admNos }, status: "active" as const }
      : {
          status: "active" as const,
          ...(cClass && { cClass }),
          ...(stream && { stream }),
          ...(yearId && { yearId }),
        };

  const students = await prisma.student.findMany({
    where,
    select: {
      stAdmNo: true,
      stName: true,
      cClass: true,
      stream: true,
      year: { select: { label: true } },
    },
    orderBy: [{ cClass: "asc" }, { stream: "asc" }, { stName: "asc" }],
    take: 200, // cap preview at 200 rows
  });

  return NextResponse.json({ count: students.length, students });
}
