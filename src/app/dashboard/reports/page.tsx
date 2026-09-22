import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reports — Kigumo Bendera Dorms",
  description: "View, print, and export dorm management reports.",
};

const REPORTS = [
  {
    slug: "beds-per-class",
    title: "Beds Per Class",
    description: "Current bed allocations grouped by class and stream",
    icon: "📚",
  },
  {
    slug: "beds-per-dorm",
    title: "Beds Per Dorm",
    description: "Current bed allocations grouped by dormitory",
    icon: "🏠",
  },
  {
    slug: "unoccupied-beds",
    title: "Unoccupied Beds",
    description: "All beds currently without a student assignment",
    icon: "🛏️",
  },
  {
    slug: "beds-for-repair",
    title: "Beds For Repair",
    description: "Beds flagged as needing repair",
    icon: "🔧",
  },
  {
    slug: "dorm-secretaries",
    title: "Dorm Secretaries",
    description: "Current active dorm secretaries and assistant secretaries",
    icon: "📋",
  },
  {
    slug: "dorm-cleaners",
    title: "Dorm Cleaners",
    description: "Current active dorm cleaners and their assigned areas",
    icon: "🧹",
  },
  {
    slug: "class-lists",
    title: "Class Lists",
    description: "All active students grouped by class and stream, with bed info",
    icon: "📄",
  },
];

export default function ReportsIndexPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-primary">Reports</h1>
        <p className="text-xs text-neutral-text/50 mt-0.5">
          Select a report to view, print, or export to Excel
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORTS.map((r) => (
          <Link
            key={r.slug}
            href={`/dashboard/reports/${r.slug}`}
            className="block border border-primary/20 bg-neutral p-4 rounded-sm hover:border-accent hover:bg-accent/5 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none mt-0.5" aria-hidden>
                {r.icon}
              </span>
              <div>
                <p className="font-semibold text-primary text-sm group-hover:text-primary">
                  {r.title}
                </p>
                <p className="text-xs text-neutral-text/60 mt-0.5">
                  {r.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
