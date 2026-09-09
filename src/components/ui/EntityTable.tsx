"use client";

import { EmptyState, LoadingRows, LoadingCards } from "@/components/ui/EmptyState";

/**
 * Generic responsive table/card list.
 * Desktop: <table>. Mobile: stacked cards.
 */
export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  mobileHide?: boolean; // hide this column from the mobile card detail
}

interface EntityTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: string;
  onRowClick?: (row: T) => void;
}

export function EntityTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyTitle = "No records found",
  emptyDescription,
  emptyIcon,
  onRowClick,
}: EntityTableProps<T>) {
  const visibleCols = columns;
  const mobileCols = columns.filter((c) => !c.mobileHide);

  return (
    <>
      {/* ── Desktop table ──────────────────────────────────────── */}
      <div className="hidden md:block border border-primary/15 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary text-neutral text-xs uppercase tracking-wide">
            <tr>
              {visibleCols.map((col) => (
                <th key={col.key} className="text-left px-4 py-2.5 font-semibold">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows cols={visibleCols.length} rows={7} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.length}>
                  <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={`border-t border-primary/10 transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-primary/5" : ""
                  }`}
                >
                  {visibleCols.map((col) => (
                    <td key={col.key} className="px-4 py-2.5">
                      {col.render(row)}
                    </td>
                  ))}
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
        ) : rows.length === 0 ? (
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
        ) : (
          rows.map((row) => (
            <div
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={`border border-primary/15 rounded-sm p-4 ${
                onRowClick ? "cursor-pointer hover:border-accent/50 transition-colors" : ""
              }`}
            >
              {mobileCols.map((col, i) => (
                <div key={col.key} className={i === 0 ? "mb-2" : "flex items-start gap-2 text-xs mt-1"}>
                  {i === 0 ? (
                    <div className="font-semibold text-primary text-sm">{col.render(row)}</div>
                  ) : (
                    <>
                      <span className="text-neutral-text/40 min-w-[80px]">{col.label}:</span>
                      <span className="text-neutral-text/70">{col.render(row)}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}
