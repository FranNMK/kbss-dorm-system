"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ReportShell } from "@/components/reports/ReportShell";
import { EmptyState, LoadingRows, LoadingCards } from "@/components/ui/EmptyState";

interface Row {
  stAdmNo: string;
  stName: string;
  cClass: string;
  stream: string;
  status: string;
  year: { label: string };
  bedsAssignments: Array<{ bed: { bedNo: string; dormCode: string; dorm: { dName: string } } }>;
}
interface Dorm { dormCode: string; dName: string }
interface Year { yearId: number; label: string; isCurrent: boolean }

function ClassListsInner() {
  const sp = useSearchParams();
  const yearId = sp.get("yearId") ?? "";
  const cClass = sp.get("class") ?? "";

  const [rows, setRows] = useState<Row[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [dorms] = useState<Dorm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/academic-years").then((r) => r.json()).then(setYears).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (yearId) params.set("yearId", yearId);
    if (cClass) params.set("class", cClass);
    fetch(`/api/reports/class-lists?${params}`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [yearId, cClass]);

  return (
    <ReportShell
      title="Class Lists"
      description="All active students grouped by class and stream, with bed assignment info"
      slug="class-lists"
      yearId={yearId}
      cClass={cClass}
      years={years.map((y) => ({ value: String(y.yearId), label: y.label }))}
      dorms={dorms.map((d) => ({ value: d.dormCode, label: d.dName }))}
      showYearFilter
      showDormFilter={false}
      showClassFilter
      rowCount={rows.length}
      loading={loading}
    >
      {/* Desktop table */}
      <div className="hidden md:block border border-primary/15 rounded-sm overflow-hidden print-table">
        <table className="w-full text-sm">
          <thead className="bg-primary text-neutral text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Adm No.</th>
              <th className="text-left px-4 py-2.5">Student Name</th>
              <th className="text-left px-4 py-2.5">Class</th>
              <th className="text-left px-4 py-2.5">Stream</th>
              <th className="text-left px-4 py-2.5">Dorm</th>
              <th className="text-left px-4 py-2.5">Bed</th>
              <th className="text-left px-4 py-2.5">Year</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows cols={7} rows={8} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={7}>
                <EmptyState icon="📄" title="No students found" description="Try adjusting your filters." />
              </td></tr>
            ) : (
              rows.map((r) => {
                const bed = r.bedsAssignments[0]?.bed;
                return (
                  <tr key={r.stAdmNo} className="border-t border-primary/10 hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{r.stAdmNo}</td>
                    <td className="px-4 py-2.5 font-medium text-primary">{r.stName}</td>
                    <td className="px-4 py-2.5">{r.cClass}</td>
                    <td className="px-4 py-2.5">{r.stream}</td>
                    <td className="px-4 py-2.5 text-neutral-text/70">{bed?.dorm.dName ?? <span className="text-neutral-text/30">—</span>}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{bed?.bedNo ?? <span className="text-neutral-text/30">—</span>}</td>
                    <td className="px-4 py-2.5 text-neutral-text/60 text-xs">{r.year.label}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3 no-print">
        {loading ? <LoadingCards count={6} /> : rows.length === 0 ? (
          <EmptyState icon="📄" title="No students found" description="Try adjusting your filters." />
        ) : rows.map((r) => {
          const bed = r.bedsAssignments[0]?.bed;
          return (
            <div key={r.stAdmNo} className="border border-primary/15 rounded-sm p-4">
              <p className="font-semibold text-primary text-sm">{r.stName}</p>
              <p className="font-mono text-xs text-neutral-text/50 mb-2">{r.stAdmNo}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-text/70">
                <span><span className="text-neutral-text/40">Class:</span> {r.cClass} {r.stream}</span>
                <span><span className="text-neutral-text/40">Year:</span> {r.year.label}</span>
                <span><span className="text-neutral-text/40">Dorm:</span> {bed?.dorm.dName ?? "—"}</span>
                <span><span className="text-neutral-text/40">Bed:</span> {bed?.bedNo ?? "—"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </ReportShell>
  );
}

export default function ClassListsPage() {
  return <Suspense><ClassListsInner /></Suspense>;
}
