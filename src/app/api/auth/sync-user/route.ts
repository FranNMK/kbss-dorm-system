/**
 * POST /api/auth/sync-user
 *
 * Called by the dashboard layout on first render after login.
 * Upserts a Users row using the Auth0 session (sub + email + role claim).
 *
 * This is an internal route — not exposed to the public.
 */
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { mapRawRole } from "@/lib/utils";

export async function POST() {
  const session = await auth0.getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { sub, email } = session.user as { sub: string; email: string };

  // Extract role from Auth0 custom claim (set via Auth0 Action)
  const rawRole: string | undefined =
    session.user["app_metadata"]?.role ??
    session.user["https://kbss-dorms/role"];

  const role: UserRole = mapRawRole(rawRole);

  const user = await prisma.user.upsert({
    where: { auth0Sub: sub },
    update: {
      email,
      role,
    },
    create: {
      auth0Sub: sub,
      email,
      role,
    },
  });

  return NextResponse.json({ ok: true, role: user.role });
}
