import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral flex flex-col items-center justify-center px-4 text-center">
      <span className="text-6xl mb-4" aria-hidden>🔍</span>
      <h1 className="text-2xl font-bold text-primary mb-2">Page Not Found</h1>
      <p className="text-sm text-neutral-text/60 mb-8 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="bg-primary text-neutral text-sm font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="border border-primary/20 text-primary text-sm font-medium px-5 py-2 rounded-sm hover:bg-primary/5 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
