/**
 * POST /api/auth/reset-request
 *
 * Body: { email }
 * - Generates a secure random reset token (valid 1 hour)
 * - Stores hashed token + expiry on the User record
 * - Sends a reset link via Resend email service
 *
 * Always returns 200 (never reveals whether email exists — security best practice).
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "noreply@kbssschool.ac.ke";
const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { email } = body as { email?: string };

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // If user exists, generate and store a reset token
  if (user) {
    const rawToken = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: rawToken, resetExpiry: expiry },
    });

    const resetLink = `${APP_BASE_URL}/reset-password?token=${rawToken}`;

    // Send email via Resend
    await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: "Password Reset — Kigumo Bendera Dorms",
      html: `
        <p>Hello ${user.name},</p>
        <p>A password reset was requested for your account on the Kigumo Bendera Dorms system.</p>
        <p>
          <a href="${resetLink}" style="background:#14213D;color:#FDFDFC;padding:10px 20px;text-decoration:none;border-radius:4px;font-family:sans-serif;">
            Reset My Password
          </a>
        </p>
        <p>This link expires in <strong>1 hour</strong>.</p>
        <p>If you did not request this, ignore this email — your password has not changed.</p>
        <p style="color:#888;font-size:12px;">Kigumo Bendera Senior School — Dorm Management System</p>
      `,
    }).catch(() => {
      // Log but don't fail the request — email is best-effort
      console.error("Failed to send reset email to", user.email);
    });
  }

  // Always return 200 — never reveal whether the email exists
  return NextResponse.json({
    ok: true,
    message: "If that email is registered, a reset link has been sent.",
  });
}
