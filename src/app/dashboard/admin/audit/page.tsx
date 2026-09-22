"use client";

/**
 * /dashboard/admin/audit
 * Paginated, filterable audit log of all admin actions.
 */
import { useState, useEffect, useCallback } from "react";
import { EmptyState, LoadingRows, LoadingCards } from "@/components/ui/EmptyState";

interface AuditEntry {
  id: number;
  userId: string;
  action: string;
  targetTable: string;
  rowCount: number;
  timestamp: string;
  details: Record<string, unknown> | null;
}

const ACTION_OPTIONS = [
  "promote",
  "promote_graduate",
  "demote",
  "archive",
  "role_change",
  "user_create",
];

function actionLabel(a: string) {
  const map: Record<string, string> = {
    promote: "Promote",
    promote_graduate: "Graduate (Archive)",
    demote: "Demote",
    archive: "Archive",
    role_change: "Role Change",
    user_create: "User Created",
  };
  return map[a] ?? a;
}

function actionBadge(a: string) {
  if (a === "archive" || a === "promote_graduate") return "bg-accent/20 text-primary";
  if (a === "demote") return "bg-primary/10 text-primary";
  if (a.startsWith("promote")) return "bg-primary/20 text-primary";
  if (a === "role_change" || a === "user_create") return "bg-primary/10 text-primary";
  return "bg-primary/5 text-primary/60";
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (filterAction) params.set("action", filterAction);
    const res = await fetch(`/api/admin/audit?${params}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, filterAction]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [filterAction]);

  const totalPages = Math.ceil(total / LIMIT);

  const selectCls =
    "border border-primary/20 rounded-sm px-3 py-1.5 text-sm bg-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-primary">Audit Log</h1>
        <p className="text-xs text-neutral-text/50 mt-0.5">
          History of all admin actions — promote, demote, archive, role changes
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className={selectCls}>
          <option value="">All Actions</option>
          {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>
        <span className="self-center text-xs text-neutral-text/50 ml-auto">
          {loading ? "Loading…" : `${total} total entr${total !== 1 ? "ies" : "y"}`}
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border border-primary/15 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary text-neutral text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Timestamp</th>
              <th className="text-left px-4 py-2.5">Actor</th>
              <th className="text-left px-4 py-2.5">Action</th>
              <th className="text-left px-4 py-2.5">Table</th>
              <th className="text-left px-4 py-2.5">Rows</th>
              <th className="text-left px-4 py-2.5">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows cols={6} rows={10} />
            ) : logs.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState icon="📜" title="No audit entries" description="Admin actions will appear here." />
              </td></tr>
            ) : (
              logs.map((entry) => (
                <>
                  <tr key={entry.id} className="border-t border-primary/10 hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-neutral-text/60 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString("en-KE", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-neutral-text/70 truncate max-w-[160px]">{entry.userId}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${actionBadge(entry.action)}`}>
                        {actionLabel(entry.action)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-neutral-text/60">{entry.targetTable}</td>
                    <td className="px-4 py-2.5 text-xs">{entry.rowCount}</td>
                    <td className="px-4 py-2.5">
                      {entry.details && (
                        <button
                          onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                          className="text-xs text-primary underline hover:text-accent transition-colors"
                        >
                          {expandedId === entry.id ? "Hide" : "View"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === entry.id && entry.details && (
                    <tr key={`${entry.id}-detail`} className="border-t border-primary/5 bg-primary/5">
                      <td colSpan={6} className="px-4 py-3">
                        <pre className="text-xs font-mono text-neutral-text/70 whitespace-pre-wrap break-all">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? <LoadingCards count={6} /> : logs.length === 0 ? (
          <EmptyState icon="📜" title="No audit entries" description="Admin actions will appear here." />
        ) : logs.map((entry) => (
          <div key={entry.id} className="border border-primary/15 rounded-sm p-4">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${actionBadge(entry.action)}`}>
                {actionLabel(entry.action)}
              </span>
              <span className="text-xs text-neutral-text/40">
                {new Date(entry.timestamp).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-text/70 mt-2">
              <span><span className="text-neutral-text/40">Actor:</span> {entry.userId}</span>
              <span><span className="text-neutral-text/40">Table:</span> {entry.targetTable}</span>
              <span><span className="text-neutral-text/40">Rows:</span> {entry.rowCount}</span>
            </div>
            {entry.details && (
              <div className="mt-2">
                <button
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className="text-xs text-primary underline"
                >
                  {expandedId === entry.id ? "Hide details" : "Show details"}
                </button>
                {expandedId === entry.id && (
                  <pre className="text-xs font-mono text-neutral-text/60 mt-2 whitespace-pre-wrap break-all">
                    {JSON.stringify(entry.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm border border-primary/15 px-3 py-1.5 rounded-sm hover:bg-primary/5 transition-colors disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-neutral-text/60">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm border border-primary/15 px-3 py-1.5 rounded-sm hover:bg-primary/5 transition-colors disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
