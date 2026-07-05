import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const scans = await prisma.file.findMany({
    where: {
      ...(user.role === "ADMIN" ? {} : { userId: user.id }),
      ...(status ? { status: status.toUpperCase() as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
      scanJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      scanResult: true,
      indicators: true,
    },
  });

  return NextResponse.json({ scans });
}
