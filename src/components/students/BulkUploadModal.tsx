"use client";

/**
 * BulkUploadModal
 *
 * 5-phase wizard for mass student uploads:
 *   Phase 1 — Select class + download template
 *   Phase 2 — Select file + parse preview
 *   Phase 3 — Validation summary / confirm
 *   Phase 4 — Uploading animation
 *   Phase 5 — Result summary
 */

import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import ExcelJS from "exceljs";

// ── Constants ──────────────────────────────────────────────────────────────

const CLASS_OPTIONS = [
  { value: "F3", label: "Form 3 (F3)", curriculum: "844" },
  { value: "F4", label: "Form 4 (F4)", curriculum: "844" },
  { value: "G10", label: "Grade 10 (G10)", curriculum: "cbc" },
  { value: "G11", label: "Grade 11 (G11)", curriculum: "cbc" },
  { value: "G12", label: "Grade 12 (G12)", curriculum: "cbc" },
];

const CBC_CLASSES = new Set(["G10", "G11", "G12"]);

interface ParsedRow {
  stAdmNo: string;
  stName: string;
  stream: string;
  indexNo?: string;
  assessmentNo?: string;
  _rowErrors: string[];
}

interface UploadResult {
  inserted: number;
  skipped: number;
  errors: { row: number; stAdmNo: string; reason: string }[];
}

interface BulkUploadModalProps {
  yearId: number;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Phase step labels ──────────────────────────────────────────────────────

const PHASES = [
  "Select Class",
  "Choose File",
  "Review",
  "Uploading",
  "Done",
] as const;
type Phase = 0 | 1 | 2 | 3 | 4;

// ── Main component ─────────────────────────────────────────────────────────

export default function BulkUploadModal({ yearId, onClose, onSuccess }: BulkUploadModalProps) {
  const [phase, setPhase] = useState<Phase>(0);
  const [selectedClass, setSelectedClass] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCBC = CBC_CLASSES.has(selectedClass);
  const templateFile = isCBC
    ? "/templates/students-template-cbc.xlsx"
    : "/templates/students-template-844.xlsx";

  // ── File parsing ───────────────────────────────────────────────────────

  const parseFile = useCallback(
    async (file: File) => {
      setParseError(null);
      setParsedRows([]);
      setFileName(file.name);

      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "csv") {
        // ── CSV via papaparse ────────────────────────────────────────
        Papa.parse<Record<string, string>>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rows = normalizeRows(results.data, selectedClass);
            setParsedRows(rows);
            setPhase(2);
          },
          error: (err) => {
            setParseError(`CSV parse error: ${err.message}`);
          },
        });
      } else if (ext === "xlsx" || ext === "xls") {
        // ── XLSX via exceljs ─────────────────────────────────────────
        try {
          const arrayBuffer = await file.arrayBuffer();
          const wb = new ExcelJS.Workbook();
          await wb.xlsx.load(arrayBuffer);
          const ws = wb.worksheets[0];
          if (!ws) {
            setParseError("The Excel file has no sheets.");
            return;
          }

          // Read headers from row 1
          const headerRow = ws.getRow(1);
          const headers: string[] = [];
          headerRow.eachCell({ includeEmpty: true }, (cell, colNo) => {
            headers[colNo - 1] = String(cell.value ?? "").trim().toUpperCase();
          });

          // Read data rows
          const rawData: Record<string, string>[] = [];
          ws.eachRow({ includeEmpty: false }, (row, rowNo) => {
            if (rowNo === 1) return; // skip header
            const obj: Record<string, string> = {};
            row.eachCell({ includeEmpty: true }, (cell, colNo) => {
              const header = headers[colNo - 1];
              if (header) obj[header] = String(cell.value ?? "").trim();
            });
            if (Object.values(obj).some((v) => v)) rawData.push(obj); // skip blank rows
          });

          const rows = normalizeRows(rawData, selectedClass);
          setParsedRows(rows);
          setPhase(2);
        } catch (e) {
          setParseError(`Excel parse error: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      } else {
        setParseError("Unsupported file type. Please upload a .xlsx or .csv file.");
      }
    },
    [isCBC]
  );

  // ── Upload ─────────────────────────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    const validRows = parsedRows.filter((r) => r._rowErrors.length === 0);
    if (validRows.length === 0) return;

    setUploading(true);
    setUploadError(null);
    setPhase(3);

    try {
      const res = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map(({ stAdmNo, stName, stream, indexNo, assessmentNo }) => ({
            stAdmNo,
            stName,
            stream,
            indexNo,
            assessmentNo,
          })),
          classCode: selectedClass,
          yearId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
        setPhase(2);
        return;
      }

      setUploadResult(data as UploadResult);
      setPhase(4);
    } catch {
      setUploadError("Network error — please try again");
      setPhase(2);
    } finally {
      setUploading(false);
    }
  }, [parsedRows, selectedClass, yearId]);

  // ── File drop/select ───────────────────────────────────────────────────

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  // ── Computed ───────────────────────────────────────────────────────────

  const rowsWithErrors = parsedRows.filter((r) => r._rowErrors.length > 0);
  const validRowCount = parsedRows.length - rowsWithErrors.length;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-neutral w-full max-w-2xl rounded-sm border border-primary/20 shadow-2xl flex flex-col max-h-[90vh]">
        {/* ── Modal header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
          <div>
            <h2 className="text-base font-bold text-primary">Bulk Upload Students</h2>
            <p className="text-xs text-neutral-text/50 mt-0.5">
              Upload an Excel or CSV file to add many students at once
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-text/40 hover:text-neutral-text transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Stepper ───────────────────────────────────────────────── */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-0">
            {PHASES.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      i < phase
                        ? "bg-green-600 text-white"
                        : i === phase
                        ? "bg-primary text-neutral"
                        : "bg-primary/10 text-primary/40"
                    }`}
                  >
                    {i < phase ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs mt-1 whitespace-nowrap hidden sm:block ${
                    i === phase ? "text-primary font-medium" : "text-neutral-text/40"
                  }`}>
                    {label}
                  </span>
                </div>
                {i < PHASES.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 transition-all duration-500 ${
                      i < phase ? "bg-green-500" : "bg-primary/10"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Phase content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Phase 0 — Select class */}
          {phase === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-text mb-2">
                  Select Class <span className="text-accent">*</span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full border border-primary/20 rounded-sm px-3 py-2 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="">Choose a class…</option>
                  <optgroup label="8-4-4 Curriculum">
                    {CLASS_OPTIONS.filter((c) => c.curriculum === "844").map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="CBC Curriculum">
                    {CLASS_OPTIONS.filter((c) => c.curriculum === "cbc").map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {selectedClass && (
                <div className="bg-primary/5 border border-primary/15 rounded-sm p-4 space-y-2">
                  <p className="text-sm font-medium text-primary">Required columns for {selectedClass}:</p>
                  <div className="flex flex-wrap gap-2">
                    {["ADMNO", "NAME", "STREAM"].map((col) => (
                      <span key={col} className="bg-primary text-neutral text-xs font-mono px-2 py-0.5 rounded-sm">
                        {col} <span className="text-accent">*</span>
                      </span>
                    ))}
                    {isCBC ? (
                      selectedClass === "G10" ? (
                        <span className="bg-primary/20 text-primary text-xs font-mono px-2 py-0.5 rounded-sm">
                          ASSESSMENT NO <span className="text-primary/40">(optional)</span>
                        </span>
                      ) : (
                        <span className="bg-primary text-neutral text-xs font-mono px-2 py-0.5 rounded-sm">
                          ASSESSMENT NO <span className="text-accent">*</span>
                        </span>
                      )
                    ) : (
                      <span className="bg-primary/20 text-primary text-xs font-mono px-2 py-0.5 rounded-sm">
                        INDEX NUMBER <span className="text-primary/40">(optional)</span>
                      </span>
                    )}
                  </div>
                  <a
                    href={templateFile}
                    download
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium mt-2 hover:text-accent transition-colors"
                  >
                    <span>⬇</span> Download template for {selectedClass}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Phase 1 — File selection */}
          {phase === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-sm p-10 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? "border-accent bg-accent/5"
                    : "border-primary/20 hover:border-primary/40 hover:bg-primary/3"
                }`}
              >
                <div className="text-3xl mb-3">📂</div>
                <p className="text-sm font-medium text-primary">
                  Drop your file here, or <span className="text-accent">click to browse</span>
                </p>
                <p className="text-xs text-neutral-text/40 mt-1">.xlsx or .csv — max 1,000 rows</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
              {parseError && (
                <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm">
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* Phase 2 — Review */}
          {phase === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-medium text-primary">{fileName}</p>
                  <p className="text-xs text-neutral-text/50">
                    {parsedRows.length} rows detected · {validRowCount} valid · {rowsWithErrors.length} with errors
                  </p>
                </div>
                <button
                  onClick={() => { setPhase(1); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-xs text-primary/60 hover:text-primary underline"
                >
                  Change file
                </button>
              </div>

              {uploadError && (
                <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm">
                  {uploadError}
                </div>
              )}

              {/* Row errors */}
              {rowsWithErrors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">
                    ⚠ {rowsWithErrors.length} row{rowsWithErrors.length !== 1 ? "s" : ""} will be skipped due to missing required fields:
                  </p>
                  <div className="border border-red-200 rounded-sm divide-y divide-red-100 max-h-36 overflow-y-auto">
                    {rowsWithErrors.map((r, i) => (
                      <div key={i} className="px-3 py-1.5 text-xs text-red-700 bg-red-50">
                        <span className="font-mono">{r.stAdmNo || "(no admno)"}</span> — {r._rowErrors.join("; ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview table */}
              {validRowCount > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-text/60 mb-1">Preview (first 5 valid rows):</p>
                  <div className="border border-primary/15 rounded-sm overflow-hidden text-xs">
                    <table className="w-full">
                      <thead className="bg-primary text-neutral">
                        <tr>
                          <th className="px-3 py-1.5 text-left">Adm No.</th>
                          <th className="px-3 py-1.5 text-left">Name</th>
                          <th className="px-3 py-1.5 text-left">Stream</th>
                          {isCBC ? (
                            <th className="px-3 py-1.5 text-left">Assessment No.</th>
                          ) : (
                            <th className="px-3 py-1.5 text-left">Index No.</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows
                          .filter((r) => r._rowErrors.length === 0)
                          .slice(0, 5)
                          .map((r, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-neutral" : "bg-primary/3"}>
                              <td className="px-3 py-1.5 font-mono">{r.stAdmNo}</td>
                              <td className="px-3 py-1.5">{r.stName}</td>
                              <td className="px-3 py-1.5">{r.stream}</td>
                              <td className="px-3 py-1.5 font-mono">
                                {isCBC ? (r.assessmentNo ?? "—") : (r.indexNo ?? "—")}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {validRowCount > 5 && (
                      <div className="px-3 py-1.5 text-neutral-text/40 italic bg-primary/3">
                        … and {validRowCount - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Phase 3 — Uploading */}
          {phase === 3 && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <UploadSpinner />
              <div className="text-center">
                <p className="text-base font-semibold text-primary">Saving students…</p>
                <p className="text-sm text-neutral-text/50 mt-1">
                  Uploading {validRowCount} record{validRowCount !== 1 ? "s" : ""} to the database
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <StepLine label="Parsing file" done />
                <StepLine label="Validating rows" done />
                <StepLine label="Saving to database" active />
              </div>
            </div>
          )}

          {/* Phase 4 — Done */}
          {phase === 4 && uploadResult && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">
                ✓
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-primary">Upload Complete</p>
                <p className="text-sm text-neutral-text/50 mt-1">Here&apos;s a summary of what happened:</p>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                <ResultCard
                  value={uploadResult.inserted}
                  label="Inserted"
                  color="bg-green-50 border-green-200 text-green-700"
                />
                <ResultCard
                  value={uploadResult.skipped}
                  label="Skipped"
                  color="bg-amber-50 border-amber-200 text-amber-700"
                  hint="duplicates"
                />
                <ResultCard
                  value={uploadResult.errors.length}
                  label="Errors"
                  color="bg-red-50 border-red-200 text-red-700"
                />
              </div>
              {uploadResult.errors.length > 0 && (
                <div className="w-full max-w-sm">
                  <p className="text-xs font-medium text-red-600 mb-1">Server-rejected rows:</p>
                  <div className="border border-red-200 rounded-sm divide-y divide-red-100 max-h-28 overflow-y-auto">
                    {uploadResult.errors.map((e, i) => (
                      <div key={i} className="px-3 py-1 text-xs text-red-700 bg-red-50">
                        Row {e.row}: <span className="font-mono">{e.stAdmNo}</span> — {e.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer actions ─────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-primary/10 flex justify-between gap-3">
          {/* Left side */}
          <div>
            {phase > 0 && phase < 3 && (
              <button
                onClick={() => setPhase((phase - 1) as Phase)}
                className="text-sm text-neutral-text/60 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors border border-primary/15"
              >
                ← Back
              </button>
            )}
          </div>

          {/* Right side */}
          <div className="flex gap-2">
            {phase < 3 && (
              <button
                onClick={onClose}
                className="text-sm text-neutral-text/60 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors"
              >
                Cancel
              </button>
            )}

            {phase === 0 && (
              <button
                disabled={!selectedClass}
                onClick={() => setPhase(1)}
                className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Next →
              </button>
            )}

            {phase === 2 && (
              <button
                disabled={validRowCount === 0 || uploading}
                onClick={handleUpload}
                className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Upload {validRowCount} Student{validRowCount !== 1 ? "s" : ""}
              </button>
            )}

            {phase === 4 && (
              <button
                onClick={() => { onSuccess(); onClose(); }}
                className="bg-accent text-primary text-sm font-semibold px-5 py-2 rounded-sm hover:bg-accent/90 transition-colors"
              >
                Close &amp; Refresh
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normalize raw header-keyed rows from CSV/XLSX into ParsedRow objects.
 * Column matching is case-insensitive.
 */
// Assessment number is required only for G11 and G12; G10 is optional
const ASSESSMENT_REQUIRED_CLASSES = new Set(["G11", "G12"]);

function normalizeRows(raw: Record<string, string>[], classCode: string): ParsedRow[] {
  return raw.map((rawRow) => {
    // Build a normalized key map (uppercase, trim)
    const norm: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawRow)) {
      norm[k.toUpperCase().trim()] = String(v ?? "").trim();
    }

    const stAdmNo = norm["ADMNO"] ?? "";
    const stName = norm["NAME"] ?? "";
    const stream = norm["STREAM"] ?? "";
    const indexNo = norm["INDEX NUMBER"] ?? undefined;
    const assessmentNo = norm["ASSESSMENT NO"] ?? norm["ASSESSMENT NUMBER"] ?? undefined;

    const _rowErrors: string[] = [];
    if (!stAdmNo) _rowErrors.push("ADMNO missing");
    if (!stName) _rowErrors.push("NAME missing");
    if (!stream) _rowErrors.push("STREAM missing");
    if (ASSESSMENT_REQUIRED_CLASSES.has(classCode) && !assessmentNo)
      _rowErrors.push("ASSESSMENT NO missing (required for G11 and G12)");

    return { stAdmNo, stName, stream, indexNo, assessmentNo, _rowErrors };
  });
}

// ── Small UI sub-components ────────────────────────────────────────────────

function UploadSpinner() {
  return (
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
      <div
        className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"
        style={{ animationDuration: "0.8s" }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-lg">📤</div>
    </div>
  );
}

function StepLine({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-all duration-300 ${
          done
            ? "bg-green-500 text-white"
            : active
            ? "bg-primary/20 border-2 border-primary animate-pulse"
            : "bg-primary/5 text-primary/30"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      <span
        className={
          done
            ? "text-green-700 font-medium"
            : active
            ? "text-primary font-semibold"
            : "text-neutral-text/30"
        }
      >
        {label}
      </span>
    </div>
  );
}

function ResultCard({
  value,
  label,
  color,
  hint,
}: {
  value: number;
  label: string;
  color: string;
  hint?: string;
}) {
  return (
    <div className={`border rounded-sm p-3 text-center ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide mt-0.5">{label}</p>
      {hint && <p className="text-xs opacity-60">{hint}</p>}
    </div>
  );
}
