"use client";

import { useState, useEffect, useCallback } from "react";
import { EmptyState, LoadingRows, LoadingCards } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";

// ── Types ──────────────────────────────────────────────────────────────────
interface Allocation {
  assignId: number;
  startDate: string;
  student: { stAdmNo: string; stName: string; cClass: string; stream: string };
  bed: { bedNo: string; dormCode: string; dorm: { dName: string }; cube: { location: string } };
  academicYear: { label: string };
}
interface Dorm { dormCode: string; dName: string }
interface AcademicYear { yearId: number; label: string; isCurrent: boolean }
interface Student { stAdmNo: string; stName: string; cClass: string; stream: string }
interface Bed { bedNo: string; dormCode: string; dorm: { dName: string }; cube: { location: string } }

const CLASS_OPTIONS = ["F3", "F4", "G10", "G11", "G12"];

// ── Assignment Form ────────────────────────────────────────────────────────
function AssignForm({
  years,
  onSuccess,
  onCancel,
  reAssignFor,
}: {
  years: AcademicYear[];
  onSuccess: () => void;
  onCancel: () => void;
  /** If set, this is a re-assign: we close this allocation first, then assign */
  reAssignFor?: Allocation;
}) {
  const [yearId, setYearId] = useState<number>(years.find((y) => y.isCurrent)?.yearId ?? (years[0]?.yearId ?? 0));
  const [studentSearch, setStudentSearch] = useState(reAssignFor?.student.stAdmNo ?? "");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(reAssignFor?.student ?? null);
  const [dormCode, setDormCode] = useState(reAssignFor?.bed.dormCode ?? "");
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [bedNo, setBedNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load dorms once
  useEffect(() => {
    fetch("/api/dorms?limit=200").then((r) => r.json()).then((d) => setDorms(d.dorms ?? d)).catch(() => {});
  }, []);

  // Student search — debounced, shows unallocated active students only
  useEffect(() => {
    if (!studentSearch.trim() || selectedStudent) return;
    const t = setTimeout(() => {
      fetch(`/api/students?search=${encodeURIComponent(studentSearch)}&status=active&limit=10`)
        .then((r) => r.json())
        .then((d) => setStudents(d.students ?? []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [studentSearch, selectedStudent]);

  // Load available beds when dorm changes
  useEffect(() => {
    if (!dormCode) { setBeds([]); setBedNo(""); return; }
    fetch(`/api/beds?dormCode=${dormCode}&occupied=false&status=ok`)
      .then((r) => r.json())
      .then(setBeds)
      .catch(() => {});
  }, [dormCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent || !bedNo || !yearId) { setError("Student, bed, and year are required"); return; }
    setSaving(true);
    setError(null);

    try {
      // If re-assigning, close the old allocation first
      if (reAssignFor) {
        const unRes = await fetch(`/api/allocation/${reAssignFor.assignId}/unassign`, { method: "PATCH" });
        if (!unRes.ok) {
          const d = await unRes.json();
          setError(d.error ?? "Failed to release current bed");
          return;
        }
      }

      const res = await fetch("/api/allocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stAdmNo: selectedStudent.stAdmNo, bedNo, yearId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      onSuccess();
    } catch { setError("Network error"); } finally { setSaving(false); }
  }

  const fieldCls = "w-full border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && <div className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2 rounded-sm">{error}</div>}

      {/* Academic Year */}
      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">Academic Year <span className="text-accent">*</span></label>
        <select value={yearId} onChange={(e) => setYearId(Number(e.target.value))} className={fieldCls}>
          {years.map((y) => <option key={y.yearId} value={y.yearId}>{y.label}{y.isCurrent ? " (current)" : ""}</option>)}
        </select>
      </div>

      {/* Student search / autocomplete */}
      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">Student <span className="text-accent">*</span></label>
        {selectedStudent ? (
          <div className="flex items-center justify-between border border-primary/20 rounded-sm px-3 py-2 bg-primary/5">
            <span className="text-sm">
              <span className="font-medium text-primary">{selectedStudent.stName}</span>
              <span className="text-neutral-text/50 ml-2 font-mono text-xs">{selectedStudent.stAdmNo}</span>
              <span className="ml-2 text-xs text-neutral-text/50">{selectedStudent.cClass} {selectedStudent.stream}</span>
            </span>
            {!reAssignFor && (
              <button type="button" onClick={() => { setSelectedStudent(null); setStudentSearch(""); }}
                className="text-xs text-neutral-text/50 hover:text-red-500 transition-colors ml-2">✕</button>
            )}
          </div>
        ) : (
          <div className="relative">
            <input value={studentSearch} onChange={(e) => { setStudentSearch(e.target.value); setSelectedStudent(null); }}
              placeholder="Search by name or admission no…"
              className={fieldCls} />
            {students.length > 0 && !selectedStudent && (
              <ul className="absolute z-20 left-0 right-0 top-full mt-0.5 border border-primary/15 bg-neutral rounded-sm shadow-none max-h-48 overflow-y-auto">
                {students.map((s) => (
                  <li key={s.stAdmNo}>
                    <button type="button"
                      onClick={() => { setSelectedStudent(s); setStudents([]); setStudentSearch(s.stName); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary/5 transition-colors">
                      <span className="font-medium text-primary">{s.stName}</span>
                      <span className="text-xs text-neutral-text/50 ml-2">{s.stAdmNo} · {s.cClass} {s.stream}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Dorm → Bed cascade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-text mb-1">Dorm <span className="text-accent">*</span></label>
          <select value={dormCode} onChange={(e) => { setDormCode(e.target.value); setBedNo(""); }} className={fieldCls}>
            <option value="">Select dorm…</option>
            {dorms.map((d) => <option key={d.dormCode} value={d.dormCode}>{d.dName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-text mb-1">Vacant Bed <span className="text-accent">*</span></label>
          <select value={bedNo} onChange={(e) => setBedNo(e.target.value)} disabled={!dormCode} className={`${fieldCls} ${!dormCode ? "opacity-40" : ""}`}>
            <option value="">{dormCode ? beds.length === 0 ? "No vacant beds" : "Select bed…" : "Select dorm first"}</option>
            {beds.map((b) => <option key={b.bedNo} value={b.bedNo}>{b.bedNo} — {b.cube.location}</option>)}
          </select>
          {dormCode && beds.length === 0 && <p className="text-xs text-amber-600 mt-1">All beds in this dorm are occupied or need repair.</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? "Saving…" : reAssignFor ? "Re-assign Bed" : "Assign Bed"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm border border-primary/15 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors">Cancel</button>
      </div>
    </form>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AllocationPage() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDorm, setFilterDorm] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [panel, setPanel] = useState<{ mode: "assign" | "reassign"; allocation?: Allocation } | null>(null);
  const [unassigning, setUnassigning] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  // Load reference data once
  useEffect(() => {
    Promise.all([
      fetch("/api/dorms?limit=200").then((r) => r.json()),
      fetch("/api/academic-years").then((r) => r.json()),
    ])
      .then(([d, y]) => { setDorms(d.dorms ?? d); setYears(y); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (filterDorm) params.set("dormCode", filterDorm);
    if (filterClass) params.set("class", filterClass);
    if (filterYear) params.set("yearId", filterYear);
    const res = await fetch(`/api/allocation?${params}`);
    const data = await res.json();
    setAllocations(data.allocations ?? (Array.isArray(data) ? data : []));
    setTotal(data.total ?? (data.allocations ?? data).length);
    setLoading(false);
  }, [filterDorm, filterClass, filterYear, page]);

  useEffect(() => { load(); }, [load]);

  async function handleUnassign(a: Allocation) {
    if (!confirm(`Un-assign ${a.student.stName} from bed ${a.bed.bedNo}? This will free the bed.`)) return;
    setUnassigning(a.assignId);
    setError(null);
    try {
      const res = await fetch(`/api/allocation/${a.assignId}/unassign`, { method: "PATCH" });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); return; }
      load();
    } catch { setError("Network error"); } finally { setUnassigning(null); }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-primary">Bed Allocation</h1>
          <p className="text-xs text-neutral-text/50 mt-0.5">Assign students to beds, un-assign, or re-assign</p>
        </div>
        <button onClick={() => setPanel({ mode: "assign" })}
          className="bg-accent text-primary text-sm font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors">
          + New Assignment
        </button>
      </div>

      {/* Inline form panel */}
      {panel && (
        <div className="border border-primary/15 bg-primary/5 rounded-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-primary mb-4">
            {panel.mode === "reassign" ? `Re-assign — ${panel.allocation?.student.stName}` : "New Bed Assignment"}
          </h2>
          <AssignForm
            years={years}
            reAssignFor={panel.mode === "reassign" ? panel.allocation : undefined}
            onSuccess={() => { setPanel(null); load(); }}
            onCancel={() => setPanel(null)}
          />
        </div>
      )}

      {/* Global error */}
      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm mb-4">
          {error} <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterDorm} onChange={(e) => setFilterDorm(e.target.value)}
          className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <option value="">All Dorms</option>
          {dorms.map((d) => <option key={d.dormCode} value={d.dormCode}>{d.dName}</option>)}
        </select>
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
          className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <option value="">All Classes</option>
          {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
          className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <option value="">All Years</option>
          {years.map((y) => <option key={y.yearId} value={y.yearId}>{y.label}</option>)}
        </select>
        <span className="self-center text-xs text-neutral-text/50 ml-auto">
          {loading ? "Loading…" : `${total} active allocation${total !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Top pagination ──────────────────────────────────────── */}
      <Pagination
        page={page}
        totalPages={Math.ceil(total / LIMIT)}
        total={total}
        limit={LIMIT}
        onPage={(p) => { setPage(p); window.scrollTo(0, 0); }}
      />

      {/* ── Desktop table ───────────────────────────────────────── */}
      <div className="hidden md:block border border-primary/15 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary text-neutral text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Student</th>
              <th className="text-left px-4 py-2.5">Adm No.</th>
              <th className="text-left px-4 py-2.5">Class</th>
              <th className="text-left px-4 py-2.5">Dorm</th>
              <th className="text-left px-4 py-2.5">Bed</th>
              <th className="text-left px-4 py-2.5">Since</th>
              <th className="text-left px-4 py-2.5">Year</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows cols={8} rows={8} />
            ) : allocations.length === 0 ? (
              <tr><td colSpan={8}>
                <EmptyState icon="🛏️" title="No active allocations" description="Click '+ New Assignment' to allocate a student to a bed." />
              </td></tr>
            ) : (
              allocations.map((a) => (
                <tr key={a.assignId} className="border-t border-primary/10 hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-primary">{a.student.stName}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{a.student.stAdmNo}</td>
                  <td className="px-4 py-2.5">{a.student.cClass} {a.student.stream}</td>
                  <td className="px-4 py-2.5 text-neutral-text/70">{a.bed.dorm.dName}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{a.bed.bedNo}</td>
                  <td className="px-4 py-2.5 text-neutral-text/60 text-xs">
                    {new Date(a.startDate).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-text/60 text-xs">{a.academicYear.label}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setPanel({ mode: "reassign", allocation: a })}
                        className="text-xs text-primary underline hover:text-accent transition-colors">Re-assign</button>
                      <button onClick={() => handleUnassign(a)} disabled={unassigning === a.assignId}
                        className="text-xs text-red-600 underline hover:text-red-800 transition-colors disabled:opacity-40">
                        {unassigning === a.assignId ? "…" : "Un-assign"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <LoadingCards count={5} />
        ) : allocations.length === 0 ? (
          <EmptyState icon="🛏️" title="No active allocations" description="Tap '+ New Assignment' to allocate a student to a bed." />
        ) : (
          allocations.map((a) => (
            <div key={a.assignId} className="border border-primary/15 rounded-sm p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-primary text-sm">{a.student.stName}</p>
                  <p className="font-mono text-xs text-neutral-text/50">{a.student.stAdmNo}</p>
                </div>
                <span className="text-xs text-neutral-text/50 bg-primary/5 px-2 py-0.5 rounded-sm">{a.academicYear.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-text/70 mb-3">
                <span><span className="text-neutral-text/40">Class:</span> {a.student.cClass} {a.student.stream}</span>
                <span><span className="text-neutral-text/40">Dorm:</span> {a.bed.dorm.dName}</span>
                <span><span className="text-neutral-text/40">Bed:</span> {a.bed.bedNo}</span>
                <span><span className="text-neutral-text/40">Since:</span> {new Date(a.startDate).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPanel({ mode: "reassign", allocation: a })}
                  className="text-xs border border-primary/15 text-primary px-3 py-1 rounded-sm hover:bg-primary/5 transition-colors">Re-assign</button>
                <button onClick={() => handleUnassign(a)} disabled={unassigning === a.assignId}
                  className="text-xs border border-red-200 text-red-600 px-3 py-1 rounded-sm hover:bg-red-50 transition-colors disabled:opacity-40">
                  {unassigning === a.assignId ? "…" : "Un-assign"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
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
