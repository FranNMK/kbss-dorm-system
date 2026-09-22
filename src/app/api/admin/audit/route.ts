/**
 * GET /api/admin/audit  — paginated audit log (admin only)
 *
 * Query params:
 *   page    : 1-based page number (default 1)
 *   limit   : rows per page (default 50, max 200)
 *   action  : filter by action type
 *   userId  : filter by actor email
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(200, Math.max(10, Number(sp.get("limit") ?? 50)));
  const action = sp.get("action") || undefined;
  const userId = sp.get("userId") || undefined;

  const where = {
    ...(action && { action }),
    ...(userId && { userId: { contains: userId } }),
  };

  const [total, logs] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ total, page, limit, logs });
}
