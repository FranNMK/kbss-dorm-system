interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = "📭", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-4xl mb-3" aria-hidden>{icon}</span>
      <h3 className="text-sm font-semibold text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-neutral-text/50 max-w-xs mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}

export function LoadingRows({ cols = 5, rows = 8 }: { cols?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-primary/10">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div
                className="h-3 rounded-sm animate-pulse"
                style={{ background: "rgba(20,33,61,0.10)", width: c === 0 ? "60%" : "80%" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function LoadingCards({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-primary/10 rounded-sm p-4 space-y-2">
          {[80, 60, 40].map((w) => (
            <div
              key={w}
              className="h-3 rounded-sm animate-pulse"
              style={{ background: "rgba(20,33,61,0.10)", width: `${w}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
