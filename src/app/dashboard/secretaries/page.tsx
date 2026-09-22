"use client";

import { useState, useEffect, useCallback } from "react";
import { EmptyState, LoadingRows, LoadingCards } from "@/components/ui/EmptyState";

interface Secretary {
  id: number;
  role: string;
  isActive: boolean;
  student: { stAdmNo: string; stName: string; cClass: string; stream: string };
  dorm: { dName: string };
  dormCode: string;
  academicYear: { label: string };
}
interface Dorm { dormCode: string; dName: string }
interface AcademicYear { yearId: number; label: string; isCurrent: boolean }
interface Student { stAdmNo: string; stName: string; cClass: string; stream: string }

const ROLE_OPTIONS = [
  { value: "secretary", label: "Secretary" },
  { value: "assistant_secretary", label: "Assistant Secretary" },
];

function formatRole(role: string) {
  return role === "secretary" ? "Secretary" : "Asst. Secretary";
}

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
  const [role, setRole] = useState("secretary");
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
    if (!selectedStudent || !dormCode || !yearId || !role) {
      setError("All fields are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/secretaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stAdmNo: selectedStudent.stAdmNo,
          dormCode,
          yearId,
          role,
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

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-neutral-text mb-1">
          Role <span className="text-accent">*</span>
        </label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className={fieldCls}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
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
          {saving ? "Saving…" : "Assign Secretary"}
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
export default function SecretariesPage() {
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
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
    const res = await fetch(`/api/secretaries?${params}`);
    const data = await res.json();
    setSecretaries(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filterDorm, filterYear]);

  useEffect(() => { load(); }, [load]);

  async function handleRemove(s: Secretary) {
    if (!confirm(`Remove ${s.student.stName} as ${formatRole(s.role)} for ${s.dorm.dName}?`)) return;
    setRemoving(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/secretaries/${s.id}`, { method: "PATCH" });
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
          <h1 className="text-xl font-bold text-primary">Dorm Secretaries</h1>
          <p className="text-xs text-neutral-text/50 mt-0.5">
            Assign and manage dorm secretary roles
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-accent text-primary text-sm font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors"
        >
          + Assign Secretary
        </button>
      </div>

      {/* Inline assign form */}
      {showForm && (
        <div className="border border-primary/15 bg-primary/5 rounded-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-primary mb-4">New Secretary Assignment</h2>
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
          {loading ? "Loading…" : `${secretaries.length} active assignment${secretaries.length !== 1 ? "s" : ""}`}
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
              <th className="text-left px-4 py-2.5">Role</th>
              <th className="text-left px-4 py-2.5">Dormitory</th>
              <th className="text-left px-4 py-2.5">Year</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows cols={7} rows={6} />
            ) : secretaries.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="📋"
                    title="No secretaries assigned"
                    description="Click '+ Assign Secretary' to assign a student."
                  />
                </td>
              </tr>
            ) : (
              secretaries.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-primary/10 hover:bg-primary/5 transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium text-primary">{s.student.stName}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.student.stAdmNo}</td>
                  <td className="px-4 py-2.5">{s.student.cClass} {s.student.stream}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-sm font-medium">
                      {formatRole(s.role)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-text/70">{s.dorm.dName}</td>
                  <td className="px-4 py-2.5 text-neutral-text/60 text-xs">{s.academicYear.label}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleRemove(s)}
                      disabled={removing === s.id}
                      className="text-xs text-red-600 underline hover:text-red-800 transition-colors disabled:opacity-40"
                    >
                      {removing === s.id ? "…" : "Remove"}
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
        ) : secretaries.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No secretaries assigned"
            description="Tap '+ Assign Secretary' to assign a student."
          />
        ) : (
          secretaries.map((s) => (
            <div key={s.id} className="border border-primary/15 rounded-sm p-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-semibold text-primary text-sm">{s.student.stName}</p>
                  <p className="font-mono text-xs text-neutral-text/50">{s.student.stAdmNo}</p>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-sm font-medium shrink-0">
                  {formatRole(s.role)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-text/70 mt-2 mb-3">
                <span><span className="text-neutral-text/40">Class:</span> {s.student.cClass} {s.student.stream}</span>
                <span><span className="text-neutral-text/40">Dorm:</span> {s.dorm.dName}</span>
                <span><span className="text-neutral-text/40">Year:</span> {s.academicYear.label}</span>
              </div>
              <button
                onClick={() => handleRemove(s)}
                disabled={removing === s.id}
                className="text-xs border border-red-200 text-red-600 px-3 py-1 rounded-sm hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                {removing === s.id ? "Removing…" : "Remove"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
