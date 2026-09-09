/**
 * Server-side auth helpers — custom session-based auth (no Auth0).
 *
 * requireRole() — call at the top of every API route handler.
 * Returns a 403 NextResponse if the caller's role is not in the allowed list.
 * Returns null if the caller is authorized.
 *
 * Usage:
 *   const denied = await requireRole(["admin"]);
 *   if (denied) return denied;
 */
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession } from "./session";
import { checkDormScope } from "./utils";

export { checkDormScope };
export type { UserRole };

/**
 * Extract the role from the current session.
 * Returns "unassigned" if there is no valid session.
 */
export async function getSessionRole(): Promise<UserRole> {
  const session = await getSession();
  if (!session) return UserRole.unassigned;
  return session.role;
}

/**
 * Get the full session user object.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<{
  userId: number;
  email: string;
  name: string;
  role: UserRole;
} | null> {
  const session = await getSession();
  if (!session) return null;
  return {
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };
}

/**
 * Require the caller to have one of the specified roles.
 * Returns a 403 NextResponse if unauthorized, or null if OK.
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<NextResponse | null> {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized — please log in" }, { status: 401 });
  }

  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json(
      { error: "Forbidden — insufficient role" },
      { status: 403 }
    );
  }

  return null;
}

export { checkDormScope as checkDormScopeHelper };
