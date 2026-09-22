/**
 * GET /api/reports/[report]
 *
 * Parametric data endpoint for all 7 reports.
 * report: beds-per-class | beds-per-dorm | unoccupied-beds |
 *         beds-for-repair | dorm-secretaries | dorm-cleaners | class-lists
 *
 * Query params vary by report — see each handler below.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

interface Params { params: { report: string } }

export async function GET(request: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const yearId = sp.get("yearId") ? Number(sp.get("yearId")) : undefined;
  const dormCode = sp.get("dormCode") || undefined;
  const cClass = sp.get("class") || undefined;

  switch (params.report) {
    // ── 1. Beds allocation per class ──────────────────────────────
    case "beds-per-class": {
      const data = await prisma.bedsAssignment.findMany({
        where: {
          endDate: null,
          ...(yearId && { yearId }),
          ...(cClass && { student: { cClass } }),
          ...(dormCode && { bed: { dormCode } }),
        },
        include: {
          student: { select: { stAdmNo: true, stName: true, cClass: true, stream: true } },
          bed: { select: { bedNo: true, dormCode: true, dorm: { select: { dName: true } } } },
          academicYear: { select: { label: true } },
        },
        orderBy: [{ student: { cClass: "asc" } }, { student: { stream: "asc" } }, { student: { stName: "asc" } }],
      });
      return NextResponse.json(data);
    }

    // ── 2. Beds allocation per dorm ───────────────────────────────
    case "beds-per-dorm": {
      const data = await prisma.bedsAssignment.findMany({
        where: {
          endDate: null,
          ...(yearId && { yearId }),
          ...(dormCode && { bed: { dormCode } }),
          ...(cClass && { student: { cClass } }),
        },
        include: {
          student: { select: { stAdmNo: true, stName: true, cClass: true, stream: true } },
          bed: { select: { bedNo: true, dormCode: true, dorm: { select: { dName: true } }, cube: { select: { location: true } } } },
          academicYear: { select: { label: true } },
        },
        orderBy: [{ bed: { dormCode: "asc" } }, { bed: { bedNo: "asc" } }],
      });
      return NextResponse.json(data);
    }

    // ── 3. Unoccupied beds ────────────────────────────────────────
    case "unoccupied-beds": {
      const data = await prisma.bed.findMany({
        where: {
          isOccupied: false,
          ...(dormCode && { dormCode }),
        },
        include: {
          dorm: { select: { dName: true } },
          cube: { select: { location: true } },
        },
        orderBy: [{ dormCode: "asc" }, { bedNo: "asc" }],
      });
      return NextResponse.json(data);
    }

    // ── 4. Beds for repair ────────────────────────────────────────
    case "beds-for-repair": {
      const data = await prisma.bed.findMany({
        where: {
          bedStatus: "needs_repair",
          ...(dormCode && { dormCode }),
        },
        include: {
          dorm: { select: { dName: true } },
          cube: { select: { location: true } },
        },
        orderBy: [{ dormCode: "asc" }, { bedNo: "asc" }],
      });
      return NextResponse.json(data);
    }

    // ── 5. Dorm secretaries ───────────────────────────────────────
    case "dorm-secretaries": {
      const data = await prisma.dormSecretary.findMany({
        where: {
          isActive: true,
          ...(dormCode && { dormCode }),
          ...(yearId && { yearId }),
        },
        include: {
          student: { select: { stAdmNo: true, stName: true, cClass: true, stream: true } },
          dorm: { select: { dName: true } },
          academicYear: { select: { label: true } },
        },
        orderBy: [{ dormCode: "asc" }, { role: "asc" }],
      });
      return NextResponse.json(data);
    }

    // ── 6. Dorm cleaners ──────────────────────────────────────────
    case "dorm-cleaners": {
      const data = await prisma.dormCleaner.findMany({
        where: {
          isActive: true,
          ...(dormCode && { dormCode }),
          ...(yearId && { yearId }),
        },
        include: {
          student: { select: { stAdmNo: true, stName: true, cClass: true, stream: true } },
          dorm: { select: { dName: true } },
          academicYear: { select: { label: true } },
        },
        orderBy: [{ dormCode: "asc" }],
      });
      return NextResponse.json(data);
    }

    // ── 7. Class lists ────────────────────────────────────────────
    case "class-lists": {
      const data = await prisma.student.findMany({
        where: {
          status: "active",
          ...(cClass && { cClass }),
          ...(yearId && { yearId }),
        },
        include: {
          year: { select: { label: true } },
          bedsAssignments: {
            where: { endDate: null },
            select: { bed: { select: { bedNo: true, dormCode: true, dorm: { select: { dName: true } } } } },
            take: 1,
          },
        },
        orderBy: [{ cClass: "asc" }, { stream: "asc" }, { stName: "asc" }],
      });
      return NextResponse.json(data);
    }

    default:
      return NextResponse.json({ error: `Unknown report: ${params.report}` }, { status: 404 });
  }
}
