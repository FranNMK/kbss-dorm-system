/**
 * GET /api/reports/[report]/export
 *
 * Streams an .xlsx file for the given report.
 * Uses exceljs (server-side only — never imported in client components).
 * Columns and data match the on-screen report tables exactly.
 */
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

interface Params { params: { report: string } }

const SCHOOL = "Kigumo Bendera Senior School";

async function buildWorkbook(report: string, sp: URLSearchParams): Promise<ExcelJS.Workbook | null> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "KBSS Dorm System";
  wb.created = new Date();

  const yearId = sp.get("yearId") ? Number(sp.get("yearId")) : undefined;
  const dormCode = sp.get("dormCode") || undefined;
  const cClass = sp.get("class") || undefined;

  // Helper: style header rows
  function styleHeader(ws: ExcelJS.Worksheet, row: ExcelJS.Row) {
    row.font = { bold: true, color: { argb: "FFFDFDFC" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14213D" } };
    row.height = 18;
    row.eachCell((cell) => { cell.alignment = { vertical: "middle" }; });
  }

  // Helper: add school/title/date meta rows
  function addMeta(ws: ExcelJS.Worksheet, title: string, colCount: number) {
    const r1 = ws.addRow([SCHOOL]);
    r1.font = { bold: true, size: 13 };
    ws.mergeCells(`A1:${String.fromCharCode(64 + colCount)}1`);

    const r2 = ws.addRow([title]);
    r2.font = { bold: true, size: 11 };
    ws.mergeCells(`A2:${String.fromCharCode(64 + colCount)}2`);

    const r3 = ws.addRow([`Generated: ${new Date().toLocaleDateString("en-KE", { dateStyle: "long" })}`]);
    r3.font = { italic: true, color: { argb: "FF888888" } };
    ws.mergeCells(`A3:${String.fromCharCode(64 + colCount)}3`);

    ws.addRow([]); // blank spacer
  }

  switch (report) {
    case "beds-per-class": {
      const rows = await prisma.bedsAssignment.findMany({
        where: { endDate: null, ...(yearId && { yearId }), ...(cClass && { student: { cClass } }), ...(dormCode && { bed: { dormCode } }) },
        include: {
          student: { select: { stAdmNo: true, stName: true, cClass: true, stream: true } },
          bed: { select: { bedNo: true, dormCode: true, dorm: { select: { dName: true } } } },
          academicYear: { select: { label: true } },
        },
        orderBy: [{ student: { cClass: "asc" } }, { student: { stream: "asc" } }, { student: { stName: "asc" } }],
      });
      const ws = wb.addWorksheet("Beds Per Class");
      addMeta(ws, "Beds Allocation Per Class", 6);
      const hdr = ws.addRow(["Adm No.", "Student Name", "Class", "Stream", "Dorm", "Bed No."]);
      styleHeader(ws, hdr);
      rows.forEach((r) => ws.addRow([r.student.stAdmNo, r.student.stName, r.student.cClass, r.student.stream, r.bed.dorm.dName, r.bed.bedNo]));
      [10, 25, 8, 8, 22, 10].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
      break;
    }
    case "beds-per-dorm": {
      const rows = await prisma.bedsAssignment.findMany({
        where: { endDate: null, ...(yearId && { yearId }), ...(dormCode && { bed: { dormCode } }), ...(cClass && { student: { cClass } }) },
        include: {
          student: { select: { stAdmNo: true, stName: true, cClass: true, stream: true } },
          bed: { select: { bedNo: true, dormCode: true, dorm: { select: { dName: true } }, cube: { select: { location: true } } } },
          academicYear: { select: { label: true } },
        },
        orderBy: [{ bed: { dormCode: "asc" } }, { bed: { bedNo: "asc" } }],
      });
      const ws = wb.addWorksheet("Beds Per Dorm");
      addMeta(ws, "Beds Allocation Per Dorm", 7);
      const hdr = ws.addRow(["Dorm", "Bed No.", "Cube/Location", "Adm No.", "Student Name", "Class", "Stream"]);
      styleHeader(ws, hdr);
      rows.forEach((r) => ws.addRow([r.bed.dorm.dName, r.bed.bedNo, r.bed.cube.location, r.student.stAdmNo, r.student.stName, r.student.cClass, r.student.stream]));
      [22, 10, 18, 10, 25, 8, 8].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
      break;
    }
    case "unoccupied-beds": {
      const rows = await prisma.bed.findMany({
        where: { isOccupied: false, ...(dormCode && { dormCode }) },
        include: { dorm: { select: { dName: true } }, cube: { select: { location: true } } },
        orderBy: [{ dormCode: "asc" }, { bedNo: "asc" }],
      });
      const ws = wb.addWorksheet("Unoccupied Beds");
      addMeta(ws, "Unoccupied Beds", 4);
      const hdr = ws.addRow(["Dorm", "Cube/Location", "Bed No.", "Status"]);
      styleHeader(ws, hdr);
      rows.forEach((r) => ws.addRow([r.dorm.dName, r.cube.location, r.bedNo, r.bedStatus]));
      [22, 18, 10, 12].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
      break;
    }
    case "beds-for-repair": {
      const rows = await prisma.bed.findMany({
        where: { bedStatus: "needs_repair", ...(dormCode && { dormCode }) },
        include: { dorm: { select: { dName: true } }, cube: { select: { location: true } } },
        orderBy: [{ dormCode: "asc" }, { bedNo: "asc" }],
      });
      const ws = wb.addWorksheet("Beds For Repair");
      addMeta(ws, "Beds Requiring Repair", 4);
      const hdr = ws.addRow(["Dorm", "Cube/Location", "Bed No.", "Occupied"]);
      styleHeader(ws, hdr);
      rows.forEach((r) => ws.addRow([r.dorm.dName, r.cube.location, r.bedNo, r.isOccupied ? "Yes" : "No"]));
      [22, 18, 10, 10].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
      break;
    }
    case "dorm-secretaries": {
      const rows = await prisma.dormSecretary.findMany({
        where: { isActive: true, ...(dormCode && { dormCode }), ...(yearId && { yearId }) },
        include: {
          student: { select: { stAdmNo: true, stName: true, cClass: true, stream: true } },
          dorm: { select: { dName: true } },
          academicYear: { select: { label: true } },
        },
        orderBy: [{ dormCode: "asc" }, { role: "asc" }],
      });
      const ws = wb.addWorksheet("Dorm Secretaries");
      addMeta(ws, "Dorm Secretaries", 6);
      const hdr = ws.addRow(["Dorm", "Role", "Adm No.", "Student Name", "Class", "Year"]);
      styleHeader(ws, hdr);
      rows.forEach((r) => ws.addRow([r.dorm.dName, r.role.replace("_", " "), r.student.stAdmNo, r.student.stName, `${r.student.cClass} ${r.student.stream}`, r.academicYear.label]));
      [22, 20, 10, 25, 10, 12].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
      break;
    }
    case "dorm-cleaners": {
      const rows = await prisma.dormCleaner.findMany({
        where: { isActive: true, ...(dormCode && { dormCode }), ...(yearId && { yearId }) },
        include: {
          student: { select: { stAdmNo: true, stName: true, cClass: true, stream: true } },
          dorm: { select: { dName: true } },
          academicYear: { select: { label: true } },
        },
        orderBy: [{ dormCode: "asc" }],
      });
      const ws = wb.addWorksheet("Dorm Cleaners");
      addMeta(ws, "Dorm Cleaners", 6);
      const hdr = ws.addRow(["Dorm", "Area Assigned", "Adm No.", "Student Name", "Class", "Year"]);
      styleHeader(ws, hdr);
      rows.forEach((r) => ws.addRow([r.dorm.dName, r.areaAssigned, r.student.stAdmNo, r.student.stName, `${r.student.cClass} ${r.student.stream}`, r.academicYear.label]));
      [22, 22, 10, 25, 10, 12].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
      break;
    }
    case "class-lists": {
      const rows = await prisma.student.findMany({
        where: { status: "active", ...(cClass && { cClass }), ...(yearId && { yearId }) },
        include: {
          year: { select: { label: true } },
          bedsAssignments: { where: { endDate: null }, select: { bed: { select: { bedNo: true, dormCode: true, dorm: { select: { dName: true } } } } }, take: 1 },
        },
        orderBy: [{ cClass: "asc" }, { stream: "asc" }, { stName: "asc" }],
      });
      const ws = wb.addWorksheet("Class Lists");
      addMeta(ws, "Student Class Lists", 6);
      const hdr = ws.addRow(["Adm No.", "Student Name", "Class", "Stream", "Dorm", "Bed"]);
      styleHeader(ws, hdr);
      rows.forEach((r) => {
        const bed = r.bedsAssignments[0]?.bed;
        ws.addRow([r.stAdmNo, r.stName, r.cClass, r.stream, bed?.dorm.dName ?? "—", bed?.bedNo ?? "—"]);
      });
      [10, 25, 8, 8, 22, 10].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
      break;
    }
    default:
      return null;
  }

  return wb;
}

export async function GET(request: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const wb = await buildWorkbook(params.report, request.nextUrl.searchParams);
  if (!wb) {
    return NextResponse.json({ error: `Unknown report: ${params.report}` }, { status: 404 });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `kbss-${params.report}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
