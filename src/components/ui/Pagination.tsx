/**
 * Reusable pagination bar.
 * Renders nothing when totalPages <= 1.
 */
export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-primary/10">
      <span className="text-xs text-neutral-text/50">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(1)}
          disabled={page === 1}
          className="text-xs border border-primary/15 px-2 py-1 rounded-sm hover:bg-primary/5 transition-colors disabled:opacity-40"
        >
          «
        </button>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="text-sm border border-primary/15 px-3 py-1.5 rounded-sm hover:bg-primary/5 transition-colors disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="text-sm text-neutral-text/60 px-1">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="text-sm border border-primary/15 px-3 py-1.5 rounded-sm hover:bg-primary/5 transition-colors disabled:opacity-40"
        >
          Next →
        </button>
        <button
          onClick={() => onPage(totalPages)}
          disabled={page === totalPages}
          className="text-xs border border-primary/15 px-2 py-1 rounded-sm hover:bg-primary/5 transition-colors disabled:opacity-40"
        >
          »
        </button>
      </div>
    </div>
  );
}
