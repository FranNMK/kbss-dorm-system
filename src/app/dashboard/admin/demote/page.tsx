"use client";

/**
 * /dashboard/admin/demote
 *
 * Three-step flow:
 *   Step 1 — filter form (class, stream, year)
 *   Step 2 — preview affected students
 *   Step 3 — confirm → call POST /api/admin/demote
 */
import { useState, useEffect } from "react";
import { EmptyState } from "@/components/ui/EmptyState";

interface AcademicYear { yearId: number; label: string; isCurrent: boolean }
interface PreviewStudent { stAdmNo: string; stName: string; cClass: string; stream: string }

const CLASS_OPTIONS = ["F4", "F3", "G12", "G11", "G10"];
const STREAM_MAP: Record<string, string[]> = {
  F3: ["S", "N", "L", "B", "V"],
  F4: ["S", "N", "L", "B", "V"],
  G10: ["10M", "10B", "10N", "10S", "10L"],
  G11: ["11M", "11B", "11N", "11S", "11L"],
  G12: ["12M", "12B", "12N", "12S", "12L"],
};
const PREV_CLASS: Record<string, string | null> = {
  F4: "F3", F3: null, G12: "G11", G11: "G10", G10: null,
};

type Step = "filter" | "preview" | "done";

export default function DemotePage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [cClass, setCClass] = useState("F4");
  const [stream, setStream] = useState("");
  const [yearId, setYearId] = useState("");
  const [step, setStep] = useState<Step>("filter");
  const [preview, setPreview] = useState<PreviewStudent[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ demoted?: number; from?: string; to?: string } | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/academic-years").then((r) => r.json()).then(setYears).catch(() => {});
  }, []);

  async function handlePreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    const params = new URLSearchParams({ action: "demote", class: cClass });
    if (stream) params.set("stream", stream);
    if (yearId) params.set("yearId", yearId);
    const res = await fetch(`/api/admin/preview?${params}`);
    const data = await res.json();
    setPreviewLoading(false);
    if (!res.ok) { setPreviewError(data.error ?? "Error"); return; }
    setPreview(data.students ?? []);
    setStep("preview");
  }

  async function handleConfirm() {
    setSubmitting(true);
    setResultError(null);
    const res = await fetch("/api/admin/demote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class: cClass, stream: stream || undefined, yearId: yearId ? Number(yearId) : undefined }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setResultError(data.error ?? "Error"); return; }
    setResult(data);
    setStep("done");
  }

  const fieldCls = "border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const prevClass = PREV_CLASS[cClass];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-primary">Demote Students</h1>
        <p className="text-xs text-neutral-text/50 mt-0.5">
          Bulk-reverse students to a previous class. Review the preview before confirming.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6 text-xs">
        {(["filter", "preview", "done"] as Step[]).map((s, i) => (
          <span key={s} className={`px-2 py-0.5 rounded-sm font-medium ${step === s ? "bg-accent text-primary" : "bg-primary/10 text-primary/50"}`}>
            {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
        ))}
      </div>

      {/* ── Step 1: Filter ── */}
      {step === "filter" && (
        <div className="border border-primary/15 rounded-sm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-text mb-1">Class <span className="text-accent">*</span></label>
              <select value={cClass} onChange={(e) => { setCClass(e.target.value); setStream(""); }} className={`${fieldCls} w-full`}>
                {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-text mb-1">Stream <span className="text-neutral-text/40">(optional)</span></label>
              <select value={stream} onChange={(e) => setStream(e.target.value)} className={`${fieldCls} w-full`}>
                <option value="">All streams</option>
                {(STREAM_MAP[cClass] ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-text mb-1">Year <span className="text-neutral-text/40">(optional)</span></label>
              <select value={yearId} onChange={(e) => setYearId(e.target.value)} className={`${fieldCls} w-full`}>
                <option value="">All years</option>
                {years.map((y) => <option key={y.yearId} value={y.yearId}>{y.label}{y.isCurrent ? " (current)" : ""}</option>)}
              </select>
            </div>
          </div>
          <div className="pt-1">
            {prevClass ? (
              <p className="text-xs text-neutral-text/60">Will demote <strong>{cClass}</strong> → <strong>{prevClass}</strong></p>
            ) : (
              <p className="text-xs text-red-600 font-medium">✕ {cClass} is the minimum class — cannot demote further</p>
            )}
          </div>
          {previewError && <p className="text-sm text-red-600">{previewError}</p>}
          <button
            onClick={handlePreview}
            disabled={previewLoading || !prevClass}
            className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {previewLoading ? "Loading…" : "Preview Affected Students →"}
          </button>
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="border border-primary/15 rounded-sm overflow-hidden">
            <div className="bg-primary/5 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-primary">
                {preview.length} student{preview.length !== 1 ? "s" : ""} will be demoted from {cClass} to {prevClass}
              </span>
              <button onClick={() => setStep("filter")} className="text-xs text-neutral-text/50 hover:text-primary transition-colors">← Change filter</button>
            </div>
            {preview.length === 0 ? (
              <EmptyState icon="🔍" title="No students matched" description="Adjust your filters and try again." />
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-primary text-neutral text-xs uppercase tracking-wide sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2">Adm No.</th>
                      <th className="text-left px-4 py-2">Name</th>
                      <th className="text-left px-4 py-2">Class</th>
                      <th className="text-left px-4 py-2">Stream</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((s) => (
                      <tr key={s.stAdmNo} className="border-t border-primary/10">
                        <td className="px-4 py-2 font-mono text-xs">{s.stAdmNo}</td>
                        <td className="px-4 py-2">{s.stName}</td>
                        <td className="px-4 py-2">{s.cClass}</td>
                        <td className="px-4 py-2">{s.stream}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {resultError && <p className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2 rounded-sm">{resultError}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={submitting || preview.length === 0}
              className="bg-accent text-primary text-sm font-semibold px-6 py-2 rounded-sm hover:bg-accent/90 transition-colors disabled:opacity-40"
            >
              {submitting ? "Processing…" : `Confirm — Demote ${preview.length} Student${preview.length !== 1 ? "s" : ""}`}
            </button>
            <button onClick={() => setStep("filter")} className="text-sm border border-primary/15 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === "done" && result && (
        <div className="border border-primary/15 rounded-sm p-6 text-center">
          <span className="text-4xl mb-3 block">✅</span>
          <h2 className="text-lg font-bold text-primary mb-2">Demotion complete</h2>
          <p className="text-sm text-neutral-text/70 mb-4">
            {result.demoted} student{(result.demoted ?? 0) !== 1 ? "s" : ""} demoted from {result.from} to {result.to}.
          </p>
          <button onClick={() => { setStep("filter"); setResult(null); setPreview([]); }}
            className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors">
            Demote Another Cohort
          </button>
        </div>
      )}
    </div>
  );
}
