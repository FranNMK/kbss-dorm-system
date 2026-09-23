/**
 * PATCH  /api/academic-years/[yearId]  — edit label and/or mark as current
 * DELETE /api/academic-years/[yearId]  — delete year (blocked if linked data exists)
 *
 * Both routes are admin-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

interface Params {
  params: { yearId: string };
}

// ── PATCH ─────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const yearId = parseInt(params.yearId);
  if (isNaN(yearId)) {
    return NextResponse.json({ error: "Invalid yearId" }, { status: 400 });
  }

  const existing = await prisma.academicYear.findUnique({ where: { yearId } });
  if (!existing) {
    return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
  }

  let body: { label?: string; isCurrent?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { label, isCurrent } = body;

  if (label !== undefined && !label.trim()) {
    return NextResponse.json({ error: "label cannot be empty" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    // If marking this year as current, clear the flag on all others first
    if (isCurrent === true) {
      await tx.academicYear.updateMany({
        where: { isCurrent: true, NOT: { yearId } },
        data: { isCurrent: false },
      });
    }

    return tx.academicYear.update({
      where: { yearId },
      data: {
        ...(label !== undefined && { label: label.trim() }),
        ...(isCurrent !== undefined && { isCurrent }),
      },
      include: {
        _count: {
          select: {
            students: true,
            bedsAssignments: true,
            dormSecretaries: true,
            dormCleaners: true,
          },
        },
      },
    });
  });

  return NextResponse.json(updated);
}

// ── DELETE ────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const yearId = parseInt(params.yearId);
  if (isNaN(yearId)) {
    return NextResponse.json({ error: "Invalid yearId" }, { status: 400 });
  }

  const existing = await prisma.academicYear.findUnique({ where: { yearId } });
  if (!existing) {
    return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
  }

  // Count all linked records — deletion is blocked if any exist
  const [students, bedsAssignments, dormSecretaries, dormCleaners] = await Promise.all([
    prisma.student.count({ where: { yearId } }),
    prisma.bedsAssignment.count({ where: { yearId } }),
    prisma.dormSecretary.count({ where: { yearId } }),
    prisma.dormCleaner.count({ where: { yearId } }),
  ]);

  const totalLinked = students + bedsAssignments + dormSecretaries + dormCleaners;

  if (totalLinked > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete — this year has linked data. Reassign or delete the linked records first.",
        counts: { students, bedsAssignments, dormSecretaries, dormCleaners },
      },
      { status: 409 }
    );
  }

  await prisma.academicYear.delete({ where: { yearId } });

  return NextResponse.json({ deleted: true });
}
