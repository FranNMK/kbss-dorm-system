"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { EmptyState, LoadingRows, LoadingCards } from "@/components/ui/EmptyState";
import BulkUploadModal from "@/components/students/BulkUploadModal";
import ReassignYearModal from "@/components/students/ReassignYearModal";
import { Pagination } from "@/components/ui/Pagination";

// ── Types ──────────────────────────────────────────────────────────────────

interface AcademicYear {
  yearId: number;
  label: string;
  isCurrent: boolean;
}

interface BedAssignment {
  bed: { bedNo: string; dormCode: string };
}

interface Student {
  stAdmNo: string;
  stName: string;
  cClass: string;
  stream: string;
  assessmentNo?: string | null;
  status: "active" | "archived";
  year: { label: string };
  bedsAssignments: BedAssignment[];
}

const STREAM_OPTIONS: Record<string, string[]> = {
  F3: ["S", "N", "L", "B", "V"],
  F4: ["S", "N", "L", "B", "V"],
  G10: ["M", "B", "N", "S", "L"],
  G11: ["M", "B", "N", "S", "L"],
  G12: ["M", "B", "N", "S", "L"],
};

// ── Component ──────────────────────────────────────────────────────────────

interface StudentsTableProps {
  isAdmin: boolean;
}

export default function StudentsTable({ isAdmin }: StudentsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Filters (initialise from URL params) ──────────────────────────────
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [filterClass, setFilterClass] = useState(searchParams.get("class") ?? "");
  const [filterStream, setFilterStream] = useState(searchParams.get("stream") ?? "");
  const [filterYear, setFilterYear] = useState(searchParams.get("yearId") ?? "");
  const [showArchived, setShowArchived] = useState(searchParams.get("archived") === "1");
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  // ── Data state ─────────────────────────────────────────────────────────
  const [students, setStudents] = useState<Student[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [currentYearId, setCurrentYearId] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Upload modal state ─────────────────────────────────────────────────
  const [showUploadModal, setShowUploadModal] = useState(false);

  // ── Reassign year modal state ──────────────────────────────────────────
  const [showReassignModal, setShowReassignModal] = useState(false);

  // ── Delete mode state ──────────────────────────────────────────────────
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedAdmNos, setSelectedAdmNos] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // ── Fetch academic years once ──────────────────────────────────────────
  useEffect(() => {
    fetch("/api/academic-years")
      .then((r) => r.json())
      .then((data: AcademicYear[]) => {
        setYears(data);
        const current = data.find((y) => y.isCurrent);
        if (current) setCurrentYearId(current.yearId);
      })
      .catch(() => {});
  }, []);

  // ── Sync filter state → URL params ────────────────────────────────────
  const syncUrl = useCallback(
    (overrides: Partial<{
      search: string;
      filterClass: string;
      filterStream: string;
      filterYear: string;
      showArchived: boolean;
    }>) => {
      const s = overrides.search ?? search;
      const c = overrides.filterClass ?? filterClass;
      const st = overrides.filterStream ?? filterStream;
      const y = overrides.filterYear ?? filterYear;
      const arc = overrides.showArchived ?? showArchived;
      const p = new URLSearchParams();
      if (s) p.set("search", s);
      if (c) p.set("class", c);
      if (st) p.set("stream", st);
      if (y) p.set("yearId", y);
      if (arc) p.set("archived", "1");
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [search, filterClass, filterStream, filterYear, showArchived, router, pathname]
  );

  // ── Data fetcher ───────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterClass) params.set("class", filterClass);
      if (filterStream) params.set("stream", filterStream);
      if (filterYear) params.set("yearId", filterYear);
      params.set("status", showArchived ? "all" : "active");
      params.set("limit", String(LIMIT));
      params.set("page", String(page));

      const res = await fetch(`/api/students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load students");
      const data = await res.json();
      setStudents(data.students);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [search, filterClass, filterStream, filterYear, showArchived, page]);

  useEffect(() => {
    const timer = setTimeout(fetchStudents, 300);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  // ── Filter helpers ─────────────────────────────────────────────────────
  const handleClassChange = (val: string) => {
    setFilterClass(val);
    setFilterStream("");
    setPage(1);
    syncUrl({ filterClass: val, filterStream: "" });
  };
  const handleStreamChange = (val: string) => {
    setFilterStream(val);
    setPage(1);
    syncUrl({ filterStream: val });
  };
  const handleYearChange = (val: string) => {
    setFilterYear(val);
    setPage(1);
    syncUrl({ filterYear: val });
  };
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    syncUrl({ search: val });
  };
  const handleArchivedChange = (val: boolean) => {
    setShowArchived(val);
    setPage(1);
    syncUrl({ showArchived: val });
  };
  const clearFilters = () => {
    setSearch("");
    setFilterClass("");
    setFilterStream("");
    setFilterYear("");
    setShowArchived(false);
    setPage(1);
    router.replace(pathname, { scroll: false });
  };

  const hasActiveFilters =
    !!search || !!filterClass || !!filterStream || !!filterYear || showArchived;
  const streamOptions = filterClass ? (STREAM_OPTIONS[filterClass] ?? []) : [];

  // ── Delete helpers ─────────────────────────────────────────────────────
  const toggleSelect = (admNo: string) => {
    setSelectedAdmNos((prev) => {
      const next = new Set(prev);
      next.has(admNo) ? next.delete(admNo) : next.add(admNo);
      return next;
    });
  };
  const selectAll = () => setSelectedAdmNos(new Set(students.map((s) => s.stAdmNo)));
  const deselectAll = () => setSelectedAdmNos(new Set());
  const allSelected = students.length > 0 && selectedAdmNos.size === students.length;

  const exitDeleteMode = () => {
    setDeleteMode(false);
    setSelectedAdmNos(new Set());
    setConfirmingDelete(false);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (selectedAdmNos.size === 0) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/students/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stAdmNos: Array.from(selectedAdmNos) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Delete failed");
        setDeleting(false);
        return;
      }
      setDeleteSuccess(`${data.deleted} student${data.deleted !== 1 ? "s" : ""} permanently deleted.`);
      exitDeleteMode();
      fetchStudents();
    } catch {
      setDeleteError("Network error — please try again");
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Upload modal ──────────────────────────────────────────── */}
      {showUploadModal && currentYearId && (
        <BulkUploadModal
          yearId={currentYearId}
          onClose={() => setShowUploadModal(false)}
          onSuccess={fetchStudents}
        />
      )}

      {/* ── Reassign Year modal ────────────────────────────────────── */}
      {showReassignModal && (
        <ReassignYearModal
          selectedAdmNos={selectedAdmNos}
          currentFilter={{
            cClass: filterClass,
            stream: filterStream,
            yearId: filterYear,
            search,
            showArchived,
          }}
          filterCount={total}
          onClose={() => setShowReassignModal(false)}
          onSuccess={() => { fetchStudents(); setSelectedAdmNos(new Set()); }}
        />
      )}

      {/* ── Success banner ────────────────────────────────────────── */}
      {deleteSuccess && (
        <div className="border border-green-300 bg-green-50 text-green-800 text-sm px-4 py-3 rounded-sm mb-4 flex items-center justify-between">
          <span>{deleteSuccess}</span>
          <button onClick={() => setDeleteSuccess(null)} className="text-green-600 hover:text-green-800">✕</button>
        </div>
      )}

      {/* ── Toolbar (Upload + Delete mode) ────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Upload Students button — always visible */}
        {!deleteMode && (
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={!currentYearId}
            className="bg-primary text-neutral text-xs font-semibold px-3 py-1.5 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            <span>⬆</span> Upload Students
          </button>
        )}

        {/* Reassign Year button — admin only */}
        {isAdmin && !deleteMode && (
          <button
            onClick={() => setShowReassignModal(true)}
            className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-sm hover:bg-primary/20 transition-colors flex items-center gap-1.5 border border-primary/20"
          >
            <span>📅</span> Reassign Year
          </button>
        )}

        {/* Delete mode toggle — admin only */}
        {isAdmin && !deleteMode && (
          <button
            onClick={() => setDeleteMode(true)}
            className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-sm hover:bg-red-700 transition-colors flex items-center gap-1.5"
          >
            <span>✕</span> Delete Students
          </button>
        )}

        {/* Delete mode controls */}
        {deleteMode && (
          <div className="flex flex-wrap items-center gap-2 w-full">
            <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-sm">
              Delete Mode — select students to remove
            </span>
            <button
              onClick={allSelected ? deselectAll : selectAll}
              className="text-xs text-primary/70 underline hover:text-primary"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
            <div className="ml-auto flex gap-2">
              <button
                onClick={exitDeleteMode}
                className="text-xs px-3 py-1.5 rounded-sm border border-primary/20 text-neutral-text/60 hover:bg-primary/5 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={selectedAdmNos.size === 0 || deleting}
                onClick={() => setConfirmingDelete(true)}
                className="bg-red-600 text-white text-xs font-semibold px-4 py-1.5 rounded-sm hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {deleting
                  ? "Deleting…"
                  : `Delete ${selectedAdmNos.size > 0 ? selectedAdmNos.size : ""} Selected`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirmation banner ───────────────────────────────────── */}
      {confirmingDelete && (
        <div className="border border-red-400 bg-red-50 rounded-sm px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              Permanently delete {selectedAdmNos.size} student{selectedAdmNos.size !== 1 ? "s" : ""}?
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              All related records (bed assignments, roles) will also be deleted. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setConfirmingDelete(false)}
              className="text-xs px-3 py-1.5 border border-red-300 rounded-sm text-red-700 hover:bg-red-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-700 text-white text-xs font-semibold px-4 py-1.5 rounded-sm hover:bg-red-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {deleting && <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {deleting ? "Deleting…" : "Yes, Delete"}
            </button>
          </div>
        </div>
      )}

      {deleteError && (
        <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm mb-4">
          {deleteError}
        </div>
      )}

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 flex-wrap">
        {/* Search */}
        <input
          type="search"
          placeholder="Search name or adm. no…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm text-neutral-text bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent w-full sm:w-56"
        />

        {/* Class filter */}
        <select
          value={filterClass}
          onChange={(e) => handleClassChange(e.target.value)}
          className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm text-neutral-text bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Classes</option>
          <optgroup label="8-4-4">
            {["F3", "F4"].map((c) => <option key={c} value={c}>{c}</option>)}
          </optgroup>
          <optgroup label="CBC">
            {["G10", "G11", "G12"].map((c) => <option key={c} value={c}>{c}</option>)}
          </optgroup>
        </select>

        {/* Stream filter */}
        <select
          value={filterStream}
          onChange={(e) => handleStreamChange(e.target.value)}
          disabled={!filterClass}
          className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm text-neutral-text bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
        >
          <option value="">All Streams</option>
          {streamOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Year filter */}
        <select
          value={filterYear}
          onChange={(e) => handleYearChange(e.target.value)}
          className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm text-neutral-text bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y.yearId} value={y.yearId}>
              {y.label}{y.isCurrent ? " (current)" : ""}
            </option>
          ))}
        </select>

        {/* Show archived toggle (admin only) */}
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm text-neutral-text/70 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => handleArchivedChange(e.target.checked)}
              className="accent-accent"
            />
            Show archived
          </label>
        )}

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-accent underline hover:text-accent/80 self-center whitespace-nowrap"
          >
            Clear filters
          </button>
        )}

        {/* Result count */}
        <span className="ml-auto text-xs text-neutral-text/50 self-center whitespace-nowrap">
          {loading ? "Loading…" : `${total} student${total !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm mb-4">
          {error}{" "}
          <button onClick={fetchStudents} className="underline font-medium">Retry</button>
        </div>
      )}

      {/* ── Top pagination ──────────────────────────────────────────── */}
      <Pagination
        page={page}
        totalPages={Math.ceil(total / LIMIT)}
        total={total}
        limit={LIMIT}
        onPage={(p) => { setPage(p); window.scrollTo(0, 0); }}
      />

      {/* ── Desktop table (md+) ─────────────────────────────────────── */}
      <div className="hidden md:block border border-primary/15 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary text-neutral text-xs uppercase tracking-wide">
            <tr>
              {deleteMode && (
                <th className="px-3 py-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={allSelected ? deselectAll : selectAll}
                    className="accent-accent cursor-pointer"
                    title="Select all"
                  />
                </th>
              )}
              <th className="text-left px-4 py-2.5">Adm No.</th>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Class</th>
              <th className="text-left px-4 py-2.5">Stream</th>
              <th className="text-left px-4 py-2.5 hidden lg:table-cell">Assessment / Index</th>
              <th className="text-left px-4 py-2.5">Year</th>
              <th className="text-left px-4 py-2.5">Bed</th>
              <th className="text-left px-4 py-2.5">Status</th>
              {!deleteMode && <th className="px-4 py-2.5"></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows cols={deleteMode ? 9 : 9} rows={8} />
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={deleteMode ? 9 : 9}>
                  <EmptyState
                    icon="👤"
                    title="No students found"
                    description="Try adjusting your filters or add a new student."
                  />
                </td>
              </tr>
            ) : (
              students.map((s) => {
                const bed = s.bedsAssignments[0]?.bed;
                const isSelected = selectedAdmNos.has(s.stAdmNo);
                const isCBC = ["G10", "G11", "G12"].includes(s.cClass);
                return (
                  <tr
                    key={s.stAdmNo}
                    onClick={deleteMode ? () => toggleSelect(s.stAdmNo) : undefined}
                    className={`border-t border-primary/10 transition-colors ${
                      deleteMode
                        ? isSelected
                          ? "bg-red-50 cursor-pointer"
                          : "hover:bg-red-50/50 cursor-pointer"
                        : "hover:bg-primary/5"
                    }`}
                  >
                    {deleteMode && (
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(s.stAdmNo)}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-red-600 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-4 py-2.5 font-mono text-xs">{s.stAdmNo}</td>
                    <td className="px-4 py-2.5 font-medium text-primary">{s.stName}</td>
                    <td className="px-4 py-2.5">{s.cClass}</td>
                    <td className="px-4 py-2.5">{s.stream}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-neutral-text/60 hidden lg:table-cell">
                      {isCBC ? (s.assessmentNo ?? "—") : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-text/60">{s.year.label}</td>
                    <td className="px-4 py-2.5 text-neutral-text/60 font-mono text-xs">
                      {bed ? `${bed.dormCode}-${bed.bedNo}` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={s.status} />
                    </td>
                    {!deleteMode && (
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/dashboard/students/${encodeURIComponent(s.stAdmNo)}`}
                          className="text-xs text-primary underline hover:text-accent transition-colors"
                        >
                          Edit
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card list (< md) ──────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <LoadingCards count={6} />
        ) : students.length === 0 ? (
          <EmptyState
            icon="👤"
            title="No students found"
            description="Try adjusting your filters or add a new student."
          />
        ) : (
          students.map((s) => {
            const bed = s.bedsAssignments[0]?.bed;
            const isSelected = selectedAdmNos.has(s.stAdmNo);
            const isCBC = ["G10", "G11", "G12"].includes(s.cClass);
            return (
              <div
                key={s.stAdmNo}
                onClick={deleteMode ? () => toggleSelect(s.stAdmNo) : undefined}
                className={`border rounded-sm p-4 transition-all ${
                  deleteMode
                    ? isSelected
                      ? "border-red-400 bg-red-50 cursor-pointer"
                      : "border-primary/15 hover:border-red-300 cursor-pointer"
                    : "border-primary/15"
                }`}
              >
                {deleteMode && (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(s.stAdmNo)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-red-600 cursor-pointer w-4 h-4"
                    />
                    <span className="text-xs text-red-600 font-medium">
                      {isSelected ? "Selected for deletion" : "Click to select"}
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-primary text-sm">{s.stName}</p>
                    <p className="font-mono text-xs text-neutral-text/50">{s.stAdmNo}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-text/70 mb-3">
                  <span><span className="font-medium text-neutral-text/50">Class:</span> {s.cClass}</span>
                  <span><span className="font-medium text-neutral-text/50">Stream:</span> {s.stream}</span>
                  <span><span className="font-medium text-neutral-text/50">Year:</span> {s.year.label}</span>
                  <span><span className="font-medium text-neutral-text/50">Bed:</span> {bed ? `${bed.dormCode}-${bed.bedNo}` : "—"}</span>
                  {isCBC && s.assessmentNo && (
                    <span className="col-span-2">
                      <span className="font-medium text-neutral-text/50">Assessment No:</span>{" "}
                      <span className="font-mono">{s.assessmentNo}</span>
                    </span>
                  )}
                </div>
                {!deleteMode && (
                  <Link
                    href={`/dashboard/students/${encodeURIComponent(s.stAdmNo)}`}
                    className="text-xs font-medium text-primary border border-primary/20 px-3 py-1 rounded-sm hover:bg-primary/5 transition-colors inline-block"
                  >
                    View / Edit →
                  </Link>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────── */}
      <Pagination
        page={page}
        totalPages={Math.ceil(total / LIMIT)}
        total={total}
        limit={LIMIT}
        onPage={(p) => { setPage(p); window.scrollTo(0, 0); }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-sm uppercase tracking-wide ${
        status === "active"
          ? "bg-primary/10 text-primary"
          : "bg-neutral-text/10 text-neutral-text/50"
      }`}
    >
      {status}
    </span>
  );
}
