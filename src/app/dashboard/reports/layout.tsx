import Link from "next/link";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Breadcrumb back to reports index */}
      <div className="mb-4 no-print">
        <Link
          href="/dashboard/reports"
          className="text-xs text-neutral-text/50 hover:text-primary transition-colors"
        >
          ← Back to Reports
        </Link>
      </div>
      {children}
    </>
  );
}
