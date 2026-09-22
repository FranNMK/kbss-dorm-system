/**
 * GET   /api/admin/users/[id]  — get a single user
 * PATCH /api/admin/users/[id]  — update role, dormScope, or name (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, getSessionUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where: { id: Number(params.id) },
    select: { id: true, email: true, name: true, role: true, dormScope: true, createdAt: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const user = await prisma.user.findUnique({ where: { id: Number(params.id) } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();
  const { role, dormScope, name } = body;

  if (role && !Object.values(UserRole).includes(role as UserRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const actor = await getSessionUser();

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: Number(params.id) },
      data: {
        ...(role !== undefined && { role: role as UserRole }),
        ...(dormScope !== undefined && { dormScope }),
        ...(name !== undefined && { name: name.trim() }),
      },
      select: { id: true, email: true, name: true, role: true, dormScope: true },
    });

    await tx.auditLog.create({
      data: {
        userId: actor?.email ?? "unknown",
        action: "role_change",
        targetTable: "Users",
        rowCount: 1,
        details: {
          targetEmail: user.email,
          oldRole: user.role,
          newRole: role ?? user.role,
          dormScope,
        },
      },
    });

    return u;
  });

  return NextResponse.json(updated);
}
