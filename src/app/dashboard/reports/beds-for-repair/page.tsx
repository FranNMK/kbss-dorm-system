"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ReportShell } from "@/components/reports/ReportShell";
import { EmptyState, LoadingRows, LoadingCards } from "@/components/ui/EmptyState";

interface Row {
  bedNo: string;
  dormCode: string;
  bedStatus: string;
  isOccupied: boolean;
  dorm: { dName: string };
  cube: { location: string };
}
interface Dorm { dormCode: string; dName: string }
interface Year { yearId: number; label: string; isCurrent: boolean }

function BedsForRepairInner() {
  const sp = useSearchParams();
  const dormCode = sp.get("dormCode") ?? "";

  const [rows, setRows] = useState<Row[]>([]);
  const [years] = useState<Year[]>([]);
  const [dorms, setDorms] = useState<Dorm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dorms").then((r) => r.json()).then(setDorms).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dormCode) params.set("dormCode", dormCode);
    fetch(`/api/reports/beds-for-repair?${params}`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [dormCode]);

  return (
    <ReportShell
      title="Beds For Repair"
      description="Beds flagged as needing repair"
      slug="beds-for-repair"
      dormCode={dormCode}
      years={years.map((y) => ({ value: String(y.yearId), label: y.label }))}
      dorms={dorms.map((d) => ({ value: d.dormCode, label: d.dName }))}
      showYearFilter={false}
      showDormFilter
      showClassFilter={false}
      rowCount={rows.length}
      loading={loading}
    >
      {/* Desktop table */}
      <div className="hidden md:block border border-primary/15 rounded-sm overflow-hidden print-table">
        <table className="w-full text-sm">
          <thead className="bg-primary text-neutral text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Dorm</th>
              <th className="text-left px-4 py-2.5">Cube / Location</th>
              <th className="text-left px-4 py-2.5">Bed No.</th>
              <th className="text-left px-4 py-2.5">Occupied?</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows cols={4} rows={8} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={4}>
                <EmptyState icon="🔧" title="No beds need repair" description="All beds are in good condition." />
              </td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.bedNo} className="border-t border-primary/10 hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-primary">{r.dorm.dName}</td>
                  <td className="px-4 py-2.5 text-neutral-text/70">{r.cube.location}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.bedNo}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${r.isOccupied ? "bg-accent/20 text-primary" : "bg-primary/10 text-primary"}`}>
                      {r.isOccupied ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3 no-print">
        {loading ? <LoadingCards count={6} /> : rows.length === 0 ? (
          <EmptyState icon="🔧" title="No beds need repair" description="All beds are in good condition." />
        ) : rows.map((r) => (
          <div key={r.bedNo} className="border border-primary/15 rounded-sm p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-primary text-sm">{r.dorm.dName}</p>
              <span className="font-mono text-xs text-neutral-text/50 bg-primary/5 px-2 py-0.5 rounded-sm">{r.bedNo}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-text/70">
              <span><span className="text-neutral-text/40">Location:</span> {r.cube.location}</span>
              <span><span className="text-neutral-text/40">Occupied:</span> {r.isOccupied ? "Yes" : "No"}</span>
            </div>
          </div>
        ))}
      </div>
    </ReportShell>
  );
}

export default function BedsForRepairPage() {
  return <Suspense><BedsForRepairInner /></Suspense>;
}
