/**
 * GET   /api/dorms/[id]  — fetch a single dorm
 * PATCH /api/dorms/[id]  — update a dorm
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const dorm = await prisma.dorm.findUnique({
    where: { dormCode: params.id },
    include: { _count: { select: { beds: true, cubes: true } } },
  });

  if (!dorm) return NextResponse.json({ error: "Dorm not found" }, { status: 404 });
  return NextResponse.json(dorm);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin]);
  if (denied) return denied;

  const dorm = await prisma.dorm.findUnique({ where: { dormCode: params.id } });
  if (!dorm) return NextResponse.json({ error: "Dorm not found" }, { status: 404 });

  const body = await request.json();
  const { dName, capacity, patron } = body;

  const updated = await prisma.dorm.update({
    where: { dormCode: params.id },
    data: {
      ...(dName?.trim() && { dName: dName.trim() }),
      ...(capacity !== undefined && { capacity: Number(capacity) }),
      ...(patron?.trim() && { patron: patron.trim() }),
    },
  });

  return NextResponse.json(updated);
}
