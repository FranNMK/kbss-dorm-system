/**
 * Generates downloadable Excel template files for student bulk uploads.
 * Run with:  npx ts-node --project tsconfig.json scripts/generate-templates.ts
 *
 * Output:
 *   public/templates/students-template-844.xlsx   (F3/F4 — 8-4-4 curriculum)
 *   public/templates/students-template-cbc.xlsx   (G10/G11/G12 — CBC curriculum)
 */

import ExcelJS from "exceljs";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "public", "templates");

async function make844Template() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "KBSS Dorm System";
  const ws = wb.addWorksheet("Students");

  // Header row
  ws.columns = [
    { header: "ADMNO", key: "admno", width: 18 },
    { header: "NAME", key: "name", width: 32 },
    { header: "STREAM", key: "stream", width: 12 },
    { header: "INDEX NUMBER", key: "indexno", width: 18 },
  ];

  // Style header row
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF14213D" },
    };
    cell.alignment = { horizontal: "center" };
  });

  // Example rows
  ws.addRow({ admno: "KBS/2024/001", name: "JOHN KAMAU MWANGI", stream: "S", indexno: "24300001001" });
  ws.addRow({ admno: "KBS/2024/002", name: "MARY WANJIKU NJOROGE", stream: "N", indexno: "24300001002" });
  ws.addRow({ admno: "KBS/2024/003", name: "PETER OTIENO ODHIAMBO", stream: "L", indexno: "" });

  // Style example rows
  for (let r = 2; r <= 4; r++) {
    ws.getRow(r).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: r % 2 === 0 ? "FFF7F8FA" : "FFFFFFFF" },
      };
    });
  }

  // Notes row
  ws.addRow([]);
  const noteRow = ws.addRow(["NOTE: ADMNO, NAME and STREAM are mandatory. INDEX NUMBER is optional."]);
  noteRow.getCell(1).font = { italic: true, color: { argb: "FF57606A" } };

  await wb.xlsx.writeFile(path.join(OUT_DIR, "students-template-844.xlsx"));
  console.log("✓ students-template-844.xlsx");
}

async function makeCBCTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "KBSS Dorm System";
  const ws = wb.addWorksheet("Students");

  ws.columns = [
    { header: "ADMNO", key: "admno", width: 18 },
    { header: "NAME", key: "name", width: 32 },
    { header: "STREAM", key: "stream", width: 12 },
    { header: "ASSESSMENT NO", key: "assessmentno", width: 20 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF14213D" },
    };
    cell.alignment = { horizontal: "center" };
  });

  ws.addRow({ admno: "KBS/2024/101", name: "ALICE WAMBUI KARIUKI", stream: "10M", assessmentno: "A000719431" });
  ws.addRow({ admno: "KBS/2024/102", name: "BRIAN KIPCHOGE RONO", stream: "10B", assessmentno: "A000719432" });
  ws.addRow({ admno: "KBS/2024/103", name: "CYNTHIA ACHIENG OLOO", stream: "10N", assessmentno: "A000719433" });

  for (let r = 2; r <= 4; r++) {
    ws.getRow(r).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: r % 2 === 0 ? "FFF7F8FA" : "FFFFFFFF" },
      };
    });
  }

  ws.addRow([]);
  const noteRow = ws.addRow([
    "NOTE: ADMNO, NAME, STREAM and ASSESSMENT NO are ALL mandatory for Grade 10/11/12.",
  ]);
  noteRow.getCell(1).font = { italic: true, color: { argb: "FF57606A" } };

  await wb.xlsx.writeFile(path.join(OUT_DIR, "students-template-cbc.xlsx"));
  console.log("✓ students-template-cbc.xlsx");
}

(async () => {
  await make844Template();
  await makeCBCTemplate();
  console.log("Templates written to public/templates/");
})();
