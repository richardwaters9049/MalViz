import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await context.params;

  const scan = await prisma.file.findFirst({
    where: {
      id,
      ...(user.role === "ADMIN" ? {} : { userId: user.id }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      scanJobs: { orderBy: { createdAt: "desc" }, take: 5 },
      scanResult: true,
      indicators: true,
      feedback: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!scan) {
    return NextResponse.json({ error: "Scan not found." }, { status: 404 });
  }

  return NextResponse.json({ scan });
}
