"use client";

/**
 * ReassignYearModal
 *
 * Allows bulk-reassigning the academic year on students via two modes:
 *   1. Checkbox selection — reassign the specific students already selected
 *   2. Filter-based      — reassign all students matching the current filter
 */

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface AcademicYear {
  yearId: number;
  label: string;
  isCurrent: boolean;
}

interface CurrentFilter {
  cClass: string;
  stream: string;
  yearId: string;
  search: string;
  showArchived: boolean;
}

interface ReassignYearModalProps {
  selectedAdmNos: Set<string>;
  currentFilter: CurrentFilter;
  filterCount: number;       // total students matching current filter
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = "selected" | "filter";
type Phase = "form" | "confirming" | "done";

// ── Component ──────────────────────────────────────────────────────────────

export default function ReassignYearModal({
  selectedAdmNos,
  currentFilter,
  filterCount,
  onClose,
  onSuccess,
}: ReassignYearModalProps) {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);

  const [mode, setMode] = useState<Mode>(selectedAdmNos.size > 0 ? "selected" : "filter");
  const [targetYearId, setTargetYearId] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("form");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ updated: number; label: string } | null>(null);

  // Fetch years on mount
  useEffect(() => {
    fetch("/api/academic-years")
      .then((r) => r.json())
      .then((data: AcademicYear[]) => setYears(data))
      .catch(() => {})
      .finally(() => setYearsLoading(false));
  }, []);

  const selectedCount = selectedAdmNos.size;
  const targetYear = years.find((y) => y.yearId === parseInt(targetYearId));

  // How many students will be affected
  const affectedCount = mode === "selected" ? selectedCount : filterCount;

  // Filter summary text
  const filterSummary = [
    currentFilter.cClass && `Class: ${currentFilter.cClass}`,
    currentFilter.stream && `Stream: ${currentFilter.stream}`,
    currentFilter.yearId && `Year: ${years.find((y) => y.yearId === parseInt(currentFilter.yearId))?.label ?? currentFilter.yearId}`,
    currentFilter.search && `Search: "${currentFilter.search}"`,
    currentFilter.showArchived && "including archived",
  ]
    .filter(Boolean)
    .join(" · ");

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!targetYearId) return;
    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { targetYearId: parseInt(targetYearId) };

      if (mode === "selected") {
        body.stAdmNos = Array.from(selectedAdmNos);
      } else {
        body.filter = {
          ...(currentFilter.cClass && { cClass: currentFilter.cClass }),
          ...(currentFilter.stream && { stream: currentFilter.stream }),
          ...(currentFilter.yearId && { yearId: parseInt(currentFilter.yearId) }),
          ...(currentFilter.search && { search: currentFilter.search }),
          status: currentFilter.showArchived ? "all" : "active",
        };
      }

      const res = await fetch("/api/students/bulk-reassign-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reassign failed");
        setSaving(false);
        return;
      }

      setResult({ updated: data.updated, label: data.targetYear.label });
      setPhase("done");
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && phase !== "confirming") onClose(); }}
    >
      <div className="bg-neutral w-full max-w-lg rounded-sm border border-primary/20 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
          <div>
            <h2 className="text-base font-bold text-primary">Reassign Academic Year</h2>
            <p className="text-xs text-neutral-text/50 mt-0.5">
              Move students from one academic year to another
            </p>
          </div>
          {phase !== "confirming" && (
            <button
              onClick={onClose}
              className="text-neutral-text/40 hover:text-neutral-text transition-colors text-lg leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-5">

          {/* ── Done phase ───────────────────────────────────────── */}
          {phase === "done" && result && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">
                ✓
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-primary">Year Reassigned</p>
                <p className="text-sm text-neutral-text/60 mt-1">
                  <span className="font-semibold text-primary">{result.updated}</span> student
                  {result.updated !== 1 ? "s" : ""} moved to{" "}
                  <span className="font-semibold text-primary">{result.label}</span>
                </p>
              </div>
              <button
                onClick={() => { onSuccess(); onClose(); }}
                className="bg-accent text-primary text-sm font-semibold px-6 py-2 rounded-sm hover:bg-accent/90 transition-colors"
              >
                Close &amp; Refresh
              </button>
            </div>
          )}

          {/* ── Form phase ───────────────────────────────────────── */}
          {phase === "form" && (
            <>
              {/* Mode selector */}
              <div>
                <p className="text-xs font-semibold text-neutral-text/60 uppercase tracking-wide mb-2">
                  Which students?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode("selected")}
                    disabled={selectedCount === 0}
                    className={`border rounded-sm px-3 py-3 text-left transition-all ${
                      mode === "selected"
                        ? "border-primary bg-primary/8"
                        : "border-primary/20 hover:border-primary/40"
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    <p className="text-sm font-semibold text-primary">
                      Selected ({selectedCount})
                    </p>
                    <p className="text-xs text-neutral-text/50 mt-0.5">
                      {selectedCount > 0
                        ? `Reassign the ${selectedCount} checked student${selectedCount !== 1 ? "s" : ""}`
                        : "No students selected (use checkboxes)"}
                    </p>
                  </button>

                  <button
                    onClick={() => setMode("filter")}
                    className={`border rounded-sm px-3 py-3 text-left transition-all ${
                      mode === "filter"
                        ? "border-primary bg-primary/8"
                        : "border-primary/20 hover:border-primary/40"
                    }`}
                  >
                    <p className="text-sm font-semibold text-primary">
                      All matching filter ({filterCount})
                    </p>
                    <p className="text-xs text-neutral-text/50 mt-0.5 truncate">
                      {filterSummary || "No active filters — all active students"}
                    </p>
                  </button>
                </div>
              </div>

              {/* Active filter summary (filter mode) */}
              {mode === "filter" && filterSummary && (
                <div className="bg-primary/5 border border-primary/15 rounded-sm px-3 py-2 text-xs text-neutral-text/70">
                  <span className="font-medium text-primary">Active filters: </span>
                  {filterSummary}
                </div>
              )}

              {/* Target year selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-text/60 uppercase tracking-wide mb-2">
                  Move to year <span className="text-accent">*</span>
                </label>
                {yearsLoading ? (
                  <div className="h-9 bg-primary/8 rounded animate-pulse" />
                ) : (
                  <select
                    value={targetYearId}
                    onChange={(e) => { setTargetYearId(e.target.value); setError(null); }}
                    className="w-full border border-primary/20 rounded-sm px-3 py-2 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <option value="">Select target year…</option>
                    {years.map((y) => (
                      <option key={y.yearId} value={y.yearId}>
                        {y.label}{y.isCurrent ? " (current)" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-2 rounded-sm">
                  {error}
                </div>
              )}
            </>
          )}

          {/* ── Confirming phase ─────────────────────────────────── */}
          {phase === "confirming" && (
            <div className="space-y-3">
              <div className="border border-amber-300 bg-amber-50 rounded-sm px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">
                  Reassign {affectedCount} student{affectedCount !== 1 ? "s" : ""} to{" "}
                  <span className="underline">{targetYear?.label}</span>?
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  This will update the academic year on all selected records. This action is logged
                  and can be reversed by running a reassign back to the original year.
                </p>
              </div>

              {saving && (
                <div className="flex items-center gap-3 text-sm text-neutral-text/60">
                  <span className="inline-block w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  Reassigning {affectedCount} student{affectedCount !== 1 ? "s" : ""}…
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-primary/10 flex justify-between gap-3">
          <div>
            {phase === "confirming" && !saving && (
              <button
                onClick={() => setPhase("form")}
                className="text-sm text-neutral-text/60 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors border border-primary/15"
              >
                ← Back
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {phase !== "done" && phase !== "confirming" && (
              <button
                onClick={onClose}
                className="text-sm text-neutral-text/60 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors"
              >
                Cancel
              </button>
            )}

            {phase === "form" && (
              <button
                disabled={!targetYearId || affectedCount === 0}
                onClick={() => setPhase("confirming")}
                className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Review →
              </button>
            )}

            {phase === "confirming" && (
              <button
                disabled={saving}
                onClick={handleSubmit}
                className="bg-accent text-primary text-sm font-semibold px-5 py-2 rounded-sm hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                )}
                {saving ? "Reassigning…" : `Confirm Reassign`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
