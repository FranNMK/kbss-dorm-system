/**
 * POST /api/auth/login
 *
 * Body: { email, password }
 * - Looks up the user in TiDB
 * - Verifies bcrypt password
 * - Creates a signed session JWT cookie
 * - Returns { ok: true, role, name }
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSessionCookie, setSessionCookie } from "@/lib/session";
import { UserRole } from "@prisma/client";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { email, password } = body as { email?: string; password?: string };

  if (!email?.trim() || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // Always run bcrypt compare to prevent timing attacks
  const hashToCheck = user?.passwordHash ?? "$2a$12$invaliddummyhash.invaliddummy";
  const valid = await bcrypt.compare(password, hashToCheck);

  if (!user || !valid) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  if (user.role === UserRole.unassigned) {
    return NextResponse.json(
      { error: "Your account has not been assigned a role yet. Contact the administrator." },
      { status: 403 }
    );
  }

  const token = await createSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const res = NextResponse.json({
    ok: true,
    role: user.role,
    name: user.name,
  });

  return setSessionCookie(res, token);
}
