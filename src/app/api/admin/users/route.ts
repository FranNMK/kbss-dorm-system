/**
 * GET  /api/admin/users  — list all users (admin only)
 * POST /api/admin/users  — create a new user account (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, getSessionUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function GET() {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      dormScope: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const body = await request.json();
  const { email, name, password, role, dormScope } = body;

  if (!email?.trim() || !name?.trim() || !password || !role) {
    return NextResponse.json(
      { error: "email, name, password, and role are required" },
      { status: 400 },
    );
  }

  if (!Object.values(UserRole).includes(role as UserRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const actor = await getSessionUser();

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        passwordHash,
        role: role as UserRole,
        dormScope: dormScope ?? null,
      },
      select: { id: true, email: true, name: true, role: true, dormScope: true, createdAt: true },
    });

    await tx.auditLog.create({
      data: {
        userId: actor?.email ?? "unknown",
        action: "user_create",
        targetTable: "Users",
        rowCount: 1,
        details: { targetEmail: newUser.email, role },
      },
    });

    return newUser;
  });

  return NextResponse.json(user, { status: 201 });
}
