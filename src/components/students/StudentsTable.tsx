"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { EmptyState, LoadingRows, LoadingCards } from "@/components/ui/EmptyState";

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
  status: "active" | "archived";
  year: { label: string };
  bedsAssignments: BedAssignment[];
}

const CLASS_OPTIONS = ["F3", "F4", "G10", "G11", "G12"];
const STREAM_OPTIONS = {
  F3: ["S", "N", "L", "B", "V"],
  F4: ["S", "N", "L", "B", "V"],
  G10: ["10M", "10B", "10N", "10S", "10L"],
  G11: ["11M", "11B", "11N", "11S", "11L"],
  G12: ["12M", "12B", "12N", "12S", "12L"],
} as Record<string, string[]>;

// ── Component ──────────────────────────────────────────────────────────────
interface StudentsTableProps {
  isAdmin: boolean;
}

export default function StudentsTable({ isAdmin }: StudentsTableProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStream, setFilterStream] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Fetch academic years once
  useEffect(() => {
    fetch("/api/academic-years")
      .then((r) => r.json())
      .then((data) => setYears(data))
      .catch(() => {});
  }, []);

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
      params.set("limit", "100");

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
  }, [search, filterClass, filterStream, filterYear, showArchived]);

  useEffect(() => {
    const timer = setTimeout(fetchStudents, 300);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  const streamOptions = filterClass ? (STREAM_OPTIONS[filterClass] ?? []) : [];

  return (
    <div>
      {/* ── Filter bar ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 flex-wrap">
        {/* Search */}
        <input
          type="search"
          placeholder="Search name or adm. no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm text-neutral-text bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent w-full sm:w-56"
        />

        {/* Class filter */}
        <select
          value={filterClass}
          onChange={(e) => { setFilterClass(e.target.value); setFilterStream(""); }}
          className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm text-neutral-text bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Classes</option>
          {CLASS_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Stream filter */}
        <select
          value={filterStream}
          onChange={(e) => setFilterStream(e.target.value)}
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
          onChange={(e) => setFilterYear(e.target.value)}
          className="border border-primary/20 rounded-sm px-3 py-1.5 text-sm text-neutral-text bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y.yearId} value={y.yearId}>{y.label}</option>
          ))}
        </select>

        {/* Show archived toggle (admin only) */}
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm text-neutral-text/70 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-accent"
            />
            Show archived
          </label>
        )}

        {/* Result count */}
        <span className="ml-auto text-xs text-neutral-text/50 self-center whitespace-nowrap">
          {loading ? "Loading…" : `${total} student${total !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* ── Error ───────────────────────────────────────────────── */}
      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-sm mb-4">
          {error}{" "}
          <button onClick={fetchStudents} className="underline font-medium">Retry</button>
        </div>
      )}

      {/* ── Desktop table (md+) ─────────────────────────────────── */}
      <div className="hidden md:block border border-primary/15 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary text-neutral text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Adm No.</th>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Class</th>
              <th className="text-left px-4 py-2.5">Stream</th>
              <th className="text-left px-4 py-2.5">Year</th>
              <th className="text-left px-4 py-2.5">Bed</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows cols={8} rows={8} />
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={8}>
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
                return (
                  <tr
                    key={s.stAdmNo}
                    className="border-t border-primary/10 hover:bg-primary/5 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs">{s.stAdmNo}</td>
                    <td className="px-4 py-2.5 font-medium text-primary">{s.stName}</td>
                    <td className="px-4 py-2.5">{s.cClass}</td>
                    <td className="px-4 py-2.5">{s.stream}</td>
                    <td className="px-4 py-2.5 text-neutral-text/60">{s.year.label}</td>
                    <td className="px-4 py-2.5 text-neutral-text/60 font-mono text-xs">
                      {bed ? `${bed.dormCode}-${bed.bedNo}` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/dashboard/students/${encodeURIComponent(s.stAdmNo)}`}
                        className="text-xs text-primary underline hover:text-accent transition-colors"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card list (< md) ─────────────────────────────── */}
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
            return (
              <div
                key={s.stAdmNo}
                className="border border-primary/15 rounded-sm p-4"
              >
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
                </div>
                <Link
                  href={`/dashboard/students/${encodeURIComponent(s.stAdmNo)}`}
                  className="text-xs font-medium text-primary border border-primary/20 px-3 py-1 rounded-sm hover:bg-primary/5 transition-colors inline-block"
                >
                  View / Edit →
                </Link>
              </div>
            );
          })
        )}
      </div>
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
