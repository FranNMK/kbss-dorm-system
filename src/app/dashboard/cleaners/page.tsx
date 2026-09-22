"use client";

import { useState, useEffect, useCallback } from "react";
import { EmptyState, LoadingRows, LoadingCards } from "@/components/ui/EmptyState";

interface Cleaner {
  id: number;
  areaAssigned: string;
  isActive: boolean;
  student: { stAdmNo: string; stName: string; cClass: string; stream: string };
  dorm: { dName: string };
  dormCode: string;
  academicYear: { label: string };
}
interface Dorm { dormCode: string; dName: string }
interface AcademicYear { yearId: number; label: string; isCurrent: boolean }
interface Student { stAdmNo: string; stName: string; cClass: string; stream: string }

// ── Assign Form ────────────────────────────────────────────────────────────
function AssignForm({
  years,
  dorms,
  onSuccess,
  onCancel,
}: {
  years: AcademicYear[];
  dorms: Dorm[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [yearId, setYearId] = useState<number>(
    years.find((y) => y.isCurrent)?.yearId ?? years[0]?.yearId ?? 0,
  );
  const [dormCode, setDormCode] = useState("");
  const [areaAssigned, setAreaAssigned] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentSearch.trim() || selectedStudent) return;
    const t = setTimeout(() => {
      fetch(
        `/api/students?search=${encodeURIComponent(studentSearch)}&status=active&limit=10`,
      )
        .then((r) => r.json())
        .then((d) => setStudents(d.students ?? []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [studentSearch, selectedStudent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent || !dormCode || !yearId || !areaAssigned.trim()) {
      setError("All fields are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cleaners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stAdmNo: selectedStudent.stAdmNo,
          dormCode,
          yearId,
          areaAssigned,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error saving"); return; }
      onSuccess();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const fieldCls =
    "w-full border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && (
        <div className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2 rounded-sm">
          {error}
        </div>
      )}

      {/* Academic Year */}
      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">
          Academic Year <span className="text-accent">*</span>
        </label>
        <select
          value={yearId}
          onChange={(e) => setYearId(Number(e.target.value))}
          className={fieldCls}
        >
          {years.map((y) => (
            <option key={y.yearId} value={y.yearId}>
              {y.label}
              {y.isCurrent ? " (current)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Dorm */}
      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">
          Dormitory <span className="text-accent">*</span>
        </label>
        <select
          value={dormCode}
          onChange={(e) => setDormCode(e.target.value)}
          className={fieldCls}
        >
          <option value="">Select dorm…</option>
          {dorms.map((d) => (
            <option key={d.dormCode} value={d.dormCode}>
              {d.dName}
            </option>
          ))}
        </select>
      </div>

      {/* Area Assigned */}
      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">
          Area Assigned <span className="text-accent">*</span>
        </label>
        <input
          type="text"
          value={areaAssigned}
          onChange={(e) => setAreaAssigned(e.target.value)}
          placeholder="e.g. Dormitory Block A, Washrooms…"
          className={fieldCls}
        />
      </div>

      {/* Student autocomplete */}
      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">
          Student <span className="text-accent">*</span>
        </label>
        {selectedStudent ? (
          <div className="flex items-center justify-between border border-primary/20 rounded-sm px-3 py-2 bg-primary/5">
            <span className="text-sm">
              <span className="font-medium text-primary">{selectedStudent.stName}</span>
              <span className="text-neutral-text/50 ml-2 font-mono text-xs">
                {selectedStudent.stAdmNo}
              </span>
              <span className="ml-2 text-xs text-neutral-text/50">
                {selectedStudent.cClass} {selectedStudent.stream}
              </span>
            </span>
            <button
              type="button"
              onClick={() => { setSelectedStudent(null); setStudentSearch(""); }}
              className="text-xs text-neutral-text/50 hover:text-red-500 transition-colors ml-2"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setSelectedStudent(null);
              }}
              placeholder="Search by name or admission no…"
              className={fieldCls}
            />
            {students.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 top-full mt-0.5 border border-primary/15 bg-neutral rounded-sm max-h-48 overflow-y-auto">
                {students.map((s) => (
                  <li key={s.stAdmNo}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(s);
                        setStudents([]);
                        setStudentSearch(s.stName);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary/5 transition-colors"
                    >
                      <span className="font-medium text-primary">{s.stName}</span>
                      <span className="text-xs text-neutral-text/50 ml-2">
                        {s.stAdmNo} · {s.cClass} {s.stream}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Assign Cleaner"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm border border-primary/15 px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CleanersPage() {
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [filterDorm, setFilterDorm] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/academic-years").then((r) => r.json()),
      fetch("/api/dorms").then((r) => r.json()),
    ])
      .then(([y, d]) => { setYears(y); setDorms(d); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDorm) params.set("dormCode", filterDorm);
    if (filterYear) params.set("yearId", filterYear);
    const res = await fetch(`/api/cleaners?${params}`);
    const data = await res.json();
    setCleaners(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filterDorm, filterYear]);

  useEffect(() => { load(); }, [load]);

  async function handleRemove(c: Cleaner) {
    if (!confirm(`Remove ${c.student.stName} as cleaner for ${c.dorm.dName}?`)) return;
    setRemoving(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/cleaners/${c.id}`, { method: "PATCH" });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); return; }
      load();
    } catch { setError("Network error"); } finally { setRemoving(null); }
  }

  const selectCls =
    "border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-primary">Dorm Cleaners</h1>
          <p className="text-xs text-neutral-text/50 mt-0.5">
            Assign and manage dorm cleaner duties
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-accent text-primary text-sm font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors"
        >
          + Assign Cleaner
        </button>
      </div>

      {/* Inline assign form */}
      {showForm && (
        <div className="border border-primary/15 bg-primary/5 rounded-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-primary mb-4">New Cleaner Assignment</h2>
          <AssignForm
            years={years}
            dorms={dorms}
            onSuccess={() => { setShowForm(false); load(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Global error */}
      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm mb-4">
          {error}{" "}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterDorm}
          onChange={(e) => setFilterDorm(e.target.value)}
          className={selectCls}
        >
          <option value="">All Dorms</option>
          {dorms.map((d) => (
            <option key={d.dormCode} value={d.dormCode}>
              {d.dName}
            </option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className={selectCls}
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y.yearId} value={y.yearId}>
              {y.label}
            </option>
          ))}
        </select>
        <span className="self-center text-xs text-neutral-text/50 ml-auto">
          {loading
            ? "Loading…"
            : `${cleaners.length} active assignment${cleaners.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border border-primary/15 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary text-neutral text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Student</th>
              <th className="text-left px-4 py-2.5">Adm No.</th>
              <th className="text-left px-4 py-2.5">Class</th>
              <th className="text-left px-4 py-2.5">Dormitory</th>
              <th className="text-left px-4 py-2.5">Area Assigned</th>
              <th className="text-left px-4 py-2.5">Year</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows cols={7} rows={6} />
            ) : cleaners.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="🧹"
                    title="No cleaners assigned"
                    description="Click '+ Assign Cleaner' to assign a student."
                  />
                </td>
              </tr>
            ) : (
              cleaners.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-primary/10 hover:bg-primary/5 transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium text-primary">{c.student.stName}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{c.student.stAdmNo}</td>
                  <td className="px-4 py-2.5">{c.student.cClass} {c.student.stream}</td>
                  <td className="px-4 py-2.5 text-neutral-text/70">{c.dorm.dName}</td>
                  <td className="px-4 py-2.5 text-neutral-text/70">{c.areaAssigned}</td>
                  <td className="px-4 py-2.5 text-neutral-text/60 text-xs">{c.academicYear.label}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleRemove(c)}
                      disabled={removing === c.id}
                      className="text-xs text-red-600 underline hover:text-red-800 transition-colors disabled:opacity-40"
                    >
                      {removing === c.id ? "…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <LoadingCards count={4} />
        ) : cleaners.length === 0 ? (
          <EmptyState
            icon="🧹"
            title="No cleaners assigned"
            description="Tap '+ Assign Cleaner' to assign a student."
          />
        ) : (
          cleaners.map((c) => (
            <div key={c.id} className="border border-primary/15 rounded-sm p-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-semibold text-primary text-sm">{c.student.stName}</p>
                  <p className="font-mono text-xs text-neutral-text/50">{c.student.stAdmNo}</p>
                </div>
                <span className="text-xs text-neutral-text/50 bg-primary/5 px-2 py-0.5 rounded-sm shrink-0">
                  {c.academicYear.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-text/70 mt-2 mb-3">
                <span><span className="text-neutral-text/40">Class:</span> {c.student.cClass} {c.student.stream}</span>
                <span><span className="text-neutral-text/40">Dorm:</span> {c.dorm.dName}</span>
                <span className="col-span-2"><span className="text-neutral-text/40">Area:</span> {c.areaAssigned}</span>
              </div>
              <button
                onClick={() => handleRemove(c)}
                disabled={removing === c.id}
                className="text-xs border border-red-200 text-red-600 px-3 py-1 rounded-sm hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                {removing === c.id ? "Removing…" : "Remove"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
