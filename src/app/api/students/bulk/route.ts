/**
 * POST /api/students/bulk
 *
 * Mass-creates students from a parsed file upload.
 * Body:
 *   {
 *     rows: Array<{
 *       stAdmNo: string;
 *       stName: string;
 *       stream: string;
 *       indexNo?: string;      // 8-4-4 only (F3/F4), optional
 *       assessmentNo?: string; // CBC only (G10/G11/G12), required for CBC
 *     }>;
 *     classCode: string;  // F3 | F4 | G10 | G11 | G12
 *     yearId: number;
 *   }
 *
 * Returns:
 *   { inserted: number; skipped: number; errors: RowError[] }
 *
 * Duplicates (by stAdmNo already in DB) are silently skipped and counted.
 * Rows with missing mandatory fields are rejected and included in errors[].
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, getSessionUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";

const VALID_CLASSES = ["F3", "F4", "G10", "G11", "G12"] as const;
const CBC_CLASSES = new Set(["G10", "G11", "G12"]);
// G10 assessment number is optional — G11 and G12 require it
const ASSESSMENT_REQUIRED_CLASSES = new Set(["G11", "G12"]);

interface UploadRow {
  stAdmNo: string;
  stName: string;
  stream: string;
  indexNo?: string;
  assessmentNo?: string;
}

interface RowError {
  row: number;
  stAdmNo: string;
  reason: string;
}

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  let body: { rows: UploadRow[]; classCode: string; yearId: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { rows, classCode, yearId } = body;

  // ── Basic body validation ────────────────────────────────────────────────
  if (!classCode || !VALID_CLASSES.includes(classCode as (typeof VALID_CLASSES)[number])) {
    return NextResponse.json(
      { error: `classCode must be one of: ${VALID_CLASSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!yearId || typeof yearId !== "number") {
    return NextResponse.json({ error: "yearId is required and must be a number" }, { status: 400 });
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });
  }

  if (rows.length > 1000) {
    return NextResponse.json({ error: "Maximum 1000 rows per upload" }, { status: 400 });
  }

  // ── Verify academic year exists ─────────────────────────────────────────
  const year = await prisma.academicYear.findUnique({ where: { yearId } });
  if (!year) {
    return NextResponse.json({ error: `Academic year ${yearId} not found` }, { status: 400 });
  }

  const isCBC = CBC_CLASSES.has(classCode);

  // ── Per-row validation ──────────────────────────────────────────────────
  const errors: RowError[] = [];
  const validRows: UploadRow[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    const admNo = (row.stAdmNo ?? "").trim();
    const name = (row.stName ?? "").trim();
    const stream = (row.stream ?? "").trim();
    const assessmentNo = (row.assessmentNo ?? "").trim();

    if (!admNo) {
      errors.push({ row: rowNum, stAdmNo: admNo, reason: "ADMNO is missing" });
      return;
    }
    if (!name) {
      errors.push({ row: rowNum, stAdmNo: admNo, reason: "NAME is missing" });
      return;
    }
    if (!stream) {
      errors.push({ row: rowNum, stAdmNo: admNo, reason: "STREAM is missing" });
      return;
    }
    if (ASSESSMENT_REQUIRED_CLASSES.has(classCode) && !assessmentNo) {
      errors.push({ row: rowNum, stAdmNo: admNo, reason: "ASSESSMENT NO is required for G11 and G12" });
      return;
    }

    validRows.push({ stAdmNo: admNo, stName: name, stream, assessmentNo: assessmentNo || undefined });
  });

  if (validRows.length === 0) {
    return NextResponse.json({ inserted: 0, skipped: 0, errors }, { status: 200 });
  }

  // ── Duplicate detection (single bulk query) ─────────────────────────────
  const allAdmNos = validRows.map((r) => r.stAdmNo);
  const existing = await prisma.student.findMany({
    where: { stAdmNo: { in: allAdmNos } },
    select: { stAdmNo: true },
  });
  const existingSet = new Set(existing.map((e) => e.stAdmNo));

  const toInsert = validRows.filter((r) => !existingSet.has(r.stAdmNo));
  const skippedCount = validRows.length - toInsert.length;

  let insertedCount = 0;

  if (toInsert.length > 0) {
    // ── Bulk insert ─────────────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.student.createMany({
        data: toInsert.map((r) => ({
          stAdmNo: r.stAdmNo,
          stName: r.stName,
          cClass: classCode,
          stream: r.stream,
          assessmentNo: isCBC ? (r.assessmentNo ?? null) : null,
          yearId,
        })),
        skipDuplicates: true,
      });

      const user = await getSessionUser();
      await tx.auditLog.create({
        data: {
          userId: user?.email ?? "unknown",
          action: "bulk_upload",
          targetTable: "Students",
          rowCount: created.count,
          details: {
            classCode,
            yearId,
            attempted: rows.length,
            inserted: created.count,
            skipped: skippedCount,
            validationErrors: errors.length,
          },
        },
      });

      return created.count;
    });

    insertedCount = result;
  }

  return NextResponse.json(
    { inserted: insertedCount, skipped: skippedCount, errors },
    { status: 200 }
  );
}
