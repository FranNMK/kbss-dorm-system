/**
 * Server-side auth helpers.
 *
 * requireRole() — call at the top of every API route handler that needs
 * authorization. Returns a 403 NextResponse if the caller's role is not
 * in the allowed list; returns null if the caller is authorized.
 *
 * Usage:
 *   const denied = await requireRole(request, ["admin"]);
 *   if (denied) return denied;
 */
import { NextResponse } from "next/server";
import { auth0 } from "./auth0";
import { UserRole } from "@prisma/client";
import { mapRawRole, checkDormScope } from "./utils";

export { checkDormScope };
export type { UserRole };

/**
 * Extract the role from the Auth0 session.
 * The role is stored in app_metadata.role via an Auth0 Action/Rule.
 * Unknown role strings are safely mapped to "unassigned".
 */
export async function getSessionRole(): Promise<UserRole> {
  const session = await auth0.getSession();
  if (!session) return UserRole.unassigned;
  // Auth0 Action sets app_metadata.role → surfaces as a custom claim
  const rawRole: string | undefined =
    session.user["app_metadata"]?.role ??
    session.user["https://kbss-dorms/role"];
  return mapRawRole(rawRole);
}

/**
 * Require the caller to have one of the specified roles.
 * Returns a 403 NextResponse if unauthorized, or null if OK.
 *
 * @example
 *   const denied = await requireRole(["admin"]);
 *   if (denied) return denied;
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<NextResponse | null> {
  const session = await auth0.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getSessionRole();

  if (!allowedRoles.includes(role)) {
    return NextResponse.json(
      { error: "Forbidden — insufficient role" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Get the current authenticated user's Auth0 subject (sub) and email.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<{
  sub: string;
  email: string;
  name: string;
  role: UserRole;
} | null> {
  const session = await auth0.getSession();
  if (!session) return null;

  const role = await getSessionRole();

  return {
    sub: session.user.sub as string,
    email: session.user.email as string,
    name: (session.user.name ?? session.user.email) as string,
    role,
  };
}

// checkDormScope is a pure utility — imported from ./utils and re-exported above
