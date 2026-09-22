"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ReportShell } from "@/components/reports/ReportShell";
import { EmptyState, LoadingRows, LoadingCards } from "@/components/ui/EmptyState";

interface Row {
  assignId: number;
  student: { stAdmNo: string; stName: string; cClass: string; stream: string };
  bed: { bedNo: string; dormCode: string; dorm: { dName: string }; cube: { location: string } };
  academicYear: { label: string };
}
interface Dorm { dormCode: string; dName: string }
interface Year { yearId: number; label: string; isCurrent: boolean }

function BedsPerDormInner() {
  const sp = useSearchParams();
  const yearId = sp.get("yearId") ?? "";
  const dormCode = sp.get("dormCode") ?? "";
  const cClass = sp.get("class") ?? "";

  const [rows, setRows] = useState<Row[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/academic-years").then((r) => r.json()),
      fetch("/api/dorms").then((r) => r.json()),
    ]).then(([y, d]) => { setYears(y); setDorms(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (yearId) params.set("yearId", yearId);
    if (dormCode) params.set("dormCode", dormCode);
    if (cClass) params.set("class", cClass);
    fetch(`/api/reports/beds-per-dorm?${params}`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [yearId, dormCode, cClass]);

  return (
    <ReportShell
      title="Beds Per Dorm"
      description="Current bed allocations grouped by dormitory"
      slug="beds-per-dorm"
      yearId={yearId}
      dormCode={dormCode}
      cClass={cClass}
      years={years.map((y) => ({ value: String(y.yearId), label: y.label }))}
      dorms={dorms.map((d) => ({ value: d.dormCode, label: d.dName }))}
      showYearFilter
      showDormFilter
      showClassFilter
      rowCount={rows.length}
      loading={loading}
    >
      {/* Desktop table */}
      <div className="hidden md:block border border-primary/15 rounded-sm overflow-hidden print-table">
        <table className="w-full text-sm">
          <thead className="bg-primary text-neutral text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Dorm</th>
              <th className="text-left px-4 py-2.5">Bed No.</th>
              <th className="text-left px-4 py-2.5">Cube / Location</th>
              <th className="text-left px-4 py-2.5">Adm No.</th>
              <th className="text-left px-4 py-2.5">Student Name</th>
              <th className="text-left px-4 py-2.5">Class</th>
              <th className="text-left px-4 py-2.5">Year</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows cols={7} rows={8} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={7}>
                <EmptyState icon="🏠" title="No allocations found" description="Try adjusting your filters." />
              </td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.assignId} className="border-t border-primary/10 hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-primary">{r.bed.dorm.dName}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.bed.bedNo}</td>
                  <td className="px-4 py-2.5 text-neutral-text/70">{r.bed.cube.location}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.student.stAdmNo}</td>
                  <td className="px-4 py-2.5">{r.student.stName}</td>
                  <td className="px-4 py-2.5">{r.student.cClass} {r.student.stream}</td>
                  <td className="px-4 py-2.5 text-neutral-text/60 text-xs">{r.academicYear.label}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3 no-print">
        {loading ? <LoadingCards count={6} /> : rows.length === 0 ? (
          <EmptyState icon="🏠" title="No allocations found" description="Try adjusting your filters." />
        ) : rows.map((r) => (
          <div key={r.assignId} className="border border-primary/15 rounded-sm p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-primary text-sm">{r.bed.dorm.dName}</p>
              <span className="font-mono text-xs text-neutral-text/50 bg-primary/5 px-2 py-0.5 rounded-sm">{r.bed.bedNo}</span>
            </div>
            <p className="text-xs text-neutral-text/50 mb-2">{r.bed.cube.location}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-text/70">
              <span><span className="text-neutral-text/40">Student:</span> {r.student.stName}</span>
              <span><span className="text-neutral-text/40">Adm No:</span> {r.student.stAdmNo}</span>
              <span><span className="text-neutral-text/40">Class:</span> {r.student.cClass} {r.student.stream}</span>
              <span><span className="text-neutral-text/40">Year:</span> {r.academicYear.label}</span>
            </div>
          </div>
        ))}
      </div>
    </ReportShell>
  );
}

export default function BedsPerDormPage() {
  return <Suspense><BedsPerDormInner /></Suspense>;
}
