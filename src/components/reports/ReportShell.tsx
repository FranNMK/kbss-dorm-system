"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface FilterOption { value: string; label: string }

interface ReportShellProps {
  title: string;
  description: string;
  slug: string;
  /** Current search-params (passed in from the page) */
  yearId?: string;
  dormCode?: string;
  cClass?: string;
  years: FilterOption[];
  dorms: FilterOption[];
  showYearFilter?: boolean;
  showDormFilter?: boolean;
  showClassFilter?: boolean;
  children: React.ReactNode;
  rowCount?: number;
  loading?: boolean;
}

const CLASS_OPTIONS = ["F3", "F4", "G10", "G11", "G12"];

export function ReportShell({
  title,
  description,
  slug,
  yearId = "",
  dormCode = "",
  cClass = "",
  years,
  dorms,
  showYearFilter = true,
  showDormFilter = true,
  showClassFilter = false,
  children,
  rowCount,
  loading = false,
}: ReportShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router],
  );

  function buildExportUrl() {
    const params = new URLSearchParams();
    if (yearId) params.set("yearId", yearId);
    if (dormCode) params.set("dormCode", dormCode);
    if (cClass) params.set("class", cClass);
    return `/api/reports/${slug}/export?${params.toString()}`;
  }

  const selectCls =
    "border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap no-print">
        <div>
          <h1 className="text-xl font-bold text-primary">{title}</h1>
          <p className="text-xs text-neutral-text/50 mt-0.5">{description}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="border border-primary/20 text-primary text-sm font-medium px-4 py-2 rounded-sm hover:bg-primary/5 transition-colors"
          >
            🖨 Print
          </button>
          <a
            href={buildExportUrl()}
            download
            className="bg-accent text-primary text-sm font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors"
          >
            ⬇ Export Excel
          </a>
        </div>
      </div>

      {/* ── Filters ── */}
      {(showYearFilter || showDormFilter || showClassFilter) && (
        <div className="flex flex-wrap gap-2 mb-4 no-print">
          {showYearFilter && (
            <select
              value={yearId}
              onChange={(e) => updateParam("yearId", e.target.value)}
              className={selectCls}
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          )}
          {showDormFilter && (
            <select
              value={dormCode}
              onChange={(e) => updateParam("dormCode", e.target.value)}
              className={selectCls}
            >
              <option value="">All Dorms</option>
              {dorms.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          )}
          {showClassFilter && (
            <select
              value={cClass}
              onChange={(e) => updateParam("class", e.target.value)}
              className={selectCls}
            >
              <option value="">All Classes</option>
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <span className="self-center text-xs text-neutral-text/50 ml-auto">
            {loading
              ? "Loading…"
              : rowCount !== undefined
                ? `${rowCount} row${rowCount !== 1 ? "s" : ""}`
                : ""}
          </span>
        </div>
      )}

      {/* ── Print header (only visible when printing) ── */}
      <div className="print-only mb-4">
        <p className="text-base font-bold">Kigumo Bendera Senior School</p>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-neutral-text/60">
          Generated:{" "}
          {new Date().toLocaleDateString("en-KE", { dateStyle: "long" })}
        </p>
      </div>

      {/* ── Table/content area ── */}
      {children}
    </div>
  );
}
