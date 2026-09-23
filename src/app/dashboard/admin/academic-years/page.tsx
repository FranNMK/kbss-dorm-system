"use client";

/**
 * /dashboard/admin/academic-years
 *
 * Full CRUD management for academic years:
 *   - List all years with linked student counts
 *   - Add a new year (inline form at the top)
 *   - Edit a year label (inline toggle)
 *   - Mark a year as "current" (atomic swap)
 *   - Delete a year (blocked with error if linked data exists)
 */

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface YearCount {
  students: number;
  bedsAssignments: number;
  dormSecretaries: number;
  dormCleaners: number;
}

interface AcademicYear {
  yearId: number;
  label: string;
  isCurrent: boolean;
  _count: YearCount;
}

// ── Page component ─────────────────────────────────────────────────────────

export default function AcademicYearsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // ── Add-year form state ────────────────────────────────────────────────
  const [addLabel, setAddLabel] = useState("");
  const [addCurrent, setAddCurrent] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // ── Inline-edit state (keyed by yearId) ────────────────────────────────
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  // ── Per-row action errors (keyed by yearId) ────────────────────────────
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [settingCurrentId, setSettingCurrentId] = useState<number | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchYears = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const res = await fetch("/api/academic-years");
      if (!res.ok) throw new Error("Failed to load years");
      setYears(await res.json());
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchYears(); }, [fetchYears]);

  // ── Add year ───────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addLabel.trim()) { setAddError("Year label is required"); return; }
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: addLabel.trim(), isCurrent: addCurrent }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Failed to add year"); return; }
      setAddLabel("");
      setAddCurrent(false);
      fetchYears();
    } catch { setAddError("Network error"); }
    finally { setAdding(false); }
  };

  // ── Start inline edit ──────────────────────────────────────────────────
  const startEdit = (year: AcademicYear) => {
    setEditingId(year.yearId);
    setEditLabel(year.label);
    setRowErrors((prev) => ({ ...prev, [year.yearId]: "" }));
  };

  const cancelEdit = () => { setEditingId(null); setEditLabel(""); };

  // ── Save label edit ────────────────────────────────────────────────────
  const saveEdit = async (yearId: number) => {
    if (!editLabel.trim()) return;
    setSavingId(yearId);
    try {
      const res = await fetch(`/api/academic-years/${yearId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRowErrors((prev) => ({ ...prev, [yearId]: data.error ?? "Save failed" }));
        return;
      }
      setEditingId(null);
      setYears((prev) => prev.map((y) => y.yearId === yearId ? { ...y, ...data } : y));
    } catch {
      setRowErrors((prev) => ({ ...prev, [yearId]: "Network error" }));
    } finally { setSavingId(null); }
  };

  // ── Set as current ─────────────────────────────────────────────────────
  const handleSetCurrent = async (yearId: number) => {
    setSettingCurrentId(yearId);
    setRowErrors((prev) => ({ ...prev, [yearId]: "" }));
    try {
      const res = await fetch(`/api/academic-years/${yearId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCurrent: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRowErrors((prev) => ({ ...prev, [yearId]: data.error ?? "Failed" }));
        return;
      }
      // Atomically update local state — clear current on all others, set on this one
      setYears((prev) =>
        prev.map((y) => ({ ...y, isCurrent: y.yearId === yearId }))
      );
    } catch {
      setRowErrors((prev) => ({ ...prev, [yearId]: "Network error" }));
    } finally { setSettingCurrentId(null); }
  };

  // ── Delete year ────────────────────────────────────────────────────────
  const handleDelete = async (yearId: number) => {
    setDeletingId(yearId);
    setRowErrors((prev) => ({ ...prev, [yearId]: "" }));
    try {
      const res = await fetch(`/api/academic-years/${yearId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        const counts = data.counts as YearCount | undefined;
        let msg = data.error ?? "Delete failed";
        if (counts) {
          const parts = [];
          if (counts.students) parts.push(`${counts.students} student${counts.students !== 1 ? "s" : ""}`);
          if (counts.bedsAssignments) parts.push(`${counts.bedsAssignments} bed assignment${counts.bedsAssignments !== 1 ? "s" : ""}`);
          if (counts.dormSecretaries) parts.push(`${counts.dormSecretaries} secretary role${counts.dormSecretaries !== 1 ? "s" : ""}`);
          if (counts.dormCleaners) parts.push(`${counts.dormCleaners} cleaner role${counts.dormCleaners !== 1 ? "s" : ""}`);
          if (parts.length) msg = `Cannot delete — linked to ${parts.join(", ")}. Reassign or delete those records first.`;
        }
        setRowErrors((prev) => ({ ...prev, [yearId]: msg }));
        return;
      }
      setYears((prev) => prev.filter((y) => y.yearId !== yearId));
    } catch {
      setRowErrors((prev) => ({ ...prev, [yearId]: "Network error" }));
    } finally { setDeletingId(null); }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-primary">Academic Years</h1>
        <p className="text-xs text-neutral-text/50 mt-0.5">
          Add, rename, and manage academic years. Mark one year as "current" for new student
          enrolments. A year cannot be deleted while it has linked students or allocations.
        </p>
      </div>

      {/* ── Add Year form ──────────────────────────────────────────── */}
      <div className="border border-primary/15 rounded-sm p-4 mb-6 bg-primary/3">
        <h2 className="text-sm font-semibold text-primary mb-3">Add New Year</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 items-start">
          <div className="flex-1">
            <input
              type="text"
              value={addLabel}
              onChange={(e) => { setAddLabel(e.target.value); setAddError(null); }}
              placeholder="e.g. 2025/2026"
              className="w-full border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
          </div>
          <label className="flex items-center gap-1.5 text-sm text-neutral-text/70 cursor-pointer select-none whitespace-nowrap pt-1.5">
            <input
              type="checkbox"
              checked={addCurrent}
              onChange={(e) => setAddCurrent(e.target.checked)}
              className="accent-accent"
            />
            Mark as current
          </label>
          <button
            type="submit"
            disabled={adding}
            className="bg-primary text-neutral text-sm font-semibold px-5 py-1.5 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {adding ? "Adding…" : "+ Add Year"}
          </button>
        </form>
      </div>

      {/* ── Page error ────────────────────────────────────────────── */}
      {pageError && (
        <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm mb-4">
          {pageError}{" "}
          <button onClick={fetchYears} className="underline font-medium">Retry</button>
        </div>
      )}

      {/* ── Years table ───────────────────────────────────────────── */}
      <div className="border border-primary/15 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary text-neutral text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Year Label</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5 hidden sm:table-cell">Students</th>
              <th className="text-left px-4 py-2.5 hidden md:table-cell">Linked Records</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t border-primary/10">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-2.5">
                      <div className="h-4 bg-primary/8 rounded animate-pulse w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : years.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-text/40 text-sm">
                  No academic years found. Add one above.
                </td>
              </tr>
            ) : (
              years.map((year) => {
                const isEditing = editingId === year.yearId;
                const rowError = rowErrors[year.yearId];
                const totalLinked =
                  year._count.bedsAssignments +
                  year._count.dormSecretaries +
                  year._count.dormCleaners;
                const hasLinked = year._count.students > 0 || totalLinked > 0;

                return (
                  <>
                    <tr
                      key={year.yearId}
                      className="border-t border-primary/10 hover:bg-primary/3 transition-colors"
                    >
                      {/* Label cell */}
                      <td className="px-4 py-2.5">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit(year.yearId);
                                if (e.key === "Escape") cancelEdit();
                              }}
                              autoFocus
                              className="border border-accent rounded-sm px-2 py-1 text-sm w-32 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            />
                            <button
                              onClick={() => saveEdit(year.yearId)}
                              disabled={savingId === year.yearId}
                              className="text-xs bg-primary text-neutral px-2 py-1 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                              {savingId === year.yearId ? "…" : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-xs text-neutral-text/50 hover:text-neutral-text px-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(year)}
                            className="font-semibold text-primary hover:text-accent transition-colors group flex items-center gap-1.5"
                            title="Click to edit label"
                          >
                            {year.label}
                            <span className="text-primary/20 group-hover:text-accent text-xs transition-colors">✎</span>
                          </button>
                        )}
                      </td>

                      {/* Status cell */}
                      <td className="px-4 py-2.5">
                        {year.isCurrent ? (
                          <span className="inline-block bg-primary text-neutral text-xs font-semibold px-2 py-0.5 rounded-sm uppercase tracking-wide">
                            Current
                          </span>
                        ) : (
                          <span className="inline-block bg-primary/10 text-primary/50 text-xs px-2 py-0.5 rounded-sm">
                            Past
                          </span>
                        )}
                      </td>

                      {/* Student count */}
                      <td className="px-4 py-2.5 hidden sm:table-cell text-neutral-text/70">
                        <span className={year._count.students > 0 ? "font-medium text-primary" : "text-neutral-text/40"}>
                          {year._count.students}
                        </span>
                      </td>

                      {/* Other linked counts */}
                      <td className="px-4 py-2.5 hidden md:table-cell text-xs text-neutral-text/50">
                        {totalLinked > 0 ? (
                          <span title={`${year._count.bedsAssignments} bed assignments, ${year._count.dormSecretaries} secretary roles, ${year._count.dormCleaners} cleaner roles`}>
                            {totalLinked} record{totalLinked !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-neutral-text/30">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Set as Current */}
                          {!year.isCurrent && (
                            <button
                              onClick={() => handleSetCurrent(year.yearId)}
                              disabled={settingCurrentId === year.yearId}
                              className="text-xs text-primary/60 border border-primary/20 px-2 py-0.5 rounded-sm hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40 whitespace-nowrap"
                            >
                              {settingCurrentId === year.yearId ? "Setting…" : "Set Current"}
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(year.yearId)}
                            disabled={deletingId === year.yearId || year.isCurrent}
                            title={year.isCurrent ? "Cannot delete the current year" : hasLinked ? "Has linked records" : "Delete year"}
                            className="text-xs text-red-600 border border-red-200 px-2 py-0.5 rounded-sm hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {deletingId === year.yearId ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline row error */}
                    {rowError && (
                      <tr key={`${year.yearId}-err`} className="border-t-0">
                        <td colSpan={5} className="px-4 pb-2 pt-0">
                          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-1.5">
                            {rowError}
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <p className="text-xs text-neutral-text/40 mt-3">
        Click a year label to edit it inline. The current year cannot be deleted.
        Years with linked students or allocations must have their data moved first.
      </p>
    </div>
  );
}
