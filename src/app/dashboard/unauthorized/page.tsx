/**
 * /dashboard/unauthorized
 *
 * Shown when a logged-in user has no role assigned yet (FR-2).
 * The user is authenticated but pending role assignment by an Admin.
 */
import { auth0 } from "@/lib/auth0";

export default async function UnauthorizedPage() {
  const session = await auth0.getSession();
  const email = session?.user?.email ?? "your account";

  return (
    <div className="min-h-screen bg-neutral flex items-center justify-center px-4">
      <div className="max-w-md w-full border border-primary/20 p-8 rounded-sm text-center">
        <div className="text-4xl mb-4" aria-hidden>
          🔒
        </div>
        <h1 className="text-xl font-bold text-primary mb-2">
          Access Pending
        </h1>
        <p className="text-neutral-text/70 text-sm mb-6">
          You&apos;re signed in as <strong>{email}</strong>, but your account
          hasn&apos;t been assigned a role yet. Please contact the system
          administrator (Deputy Principal or ICT) to have your role assigned.
        </p>
        <a
          href="/auth/logout"
          className="inline-block bg-primary text-neutral px-5 py-2 text-sm font-medium rounded-sm hover:bg-primary/90 transition-colors"
        >
          Sign Out
        </a>
      </div>
    </div>
  );
}
