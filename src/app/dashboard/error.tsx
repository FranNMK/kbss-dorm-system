"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center max-w-md mx-auto">
      <span className="text-4xl mb-4" aria-hidden>⚠️</span>
      <h2 className="text-lg font-bold text-primary mb-2">Something went wrong</h2>
      <p className="text-sm text-neutral-text/60 mb-6">
        {error.message ?? "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
