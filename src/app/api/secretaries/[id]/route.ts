/**
 * PATCH /api/secretaries/[id]  — deactivate (remove) a secretary assignment
 * GET   /api/secretaries/[id]  — fetch a single record
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const record = await prisma.dormSecretary.findUnique({
    where: { id: Number(params.id) },
    include: {
      student: { select: { stAdmNo: true, stName: true, cClass: true, stream: true } },
      dorm: { select: { dName: true } },
      academicYear: { select: { label: true } },
    },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json(record);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await requireRole([UserRole.admin, UserRole.dorm_master]);
  if (denied) return denied;

  const record = await prisma.dormSecretary.findUnique({
    where: { id: Number(params.id) },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const updated = await prisma.dormSecretary.update({
    where: { id: Number(params.id) },
    data: { isActive: false },
    include: {
      student: { select: { stAdmNo: true, stName: true } },
      dorm: { select: { dName: true } },
    },
  });

  return NextResponse.json(updated);
}
