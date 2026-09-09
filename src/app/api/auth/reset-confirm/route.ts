/**
 * POST /api/auth/reset-confirm
 *
 * Body: { token, password }
 * - Validates the reset token (exists, not expired)
 * - Hashes the new password with bcrypt
 * - Updates the user record; clears the reset token
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { token, password } = body as { token?: string; password?: string };

  if (!token?.trim() || !password) {
    return NextResponse.json(
      { error: "Token and new password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token.trim(),
      resetExpiry: { gt: new Date() }, // not expired
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetExpiry: null,
    },
  });

  return NextResponse.json({ ok: true, message: "Password updated successfully. You can now log in." });
}
