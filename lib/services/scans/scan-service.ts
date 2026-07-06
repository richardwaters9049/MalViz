import { FileStatus } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { ServiceError } from "@/lib/services/errors";

function ownerFilter(user: Pick<SessionUser, "id" | "role">) {
  return user.role === "ADMIN" ? {} : { userId: user.id };
}

export function parseFileStatus(value: string | null) {
  if (!value) return undefined;
  const normalized = value.toUpperCase();
  if (!Object.values(FileStatus).includes(normalized as FileStatus)) {
    throw new ServiceError("VALIDATION_FAILED", "Unknown scan status filter.");
  }
  return normalized as FileStatus;
}

export async function listScans(user: SessionUser, status?: FileStatus) {
  return prisma.file.findMany({
    where: {
      ...ownerFilter(user),
      ...(status ? { status } : {}),
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
}

export async function getScanDetail(user: SessionUser, id: string) {
  const scan = await prisma.file.findFirst({
    where: {
      id,
      ...ownerFilter(user),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      scanJobs: { orderBy: { createdAt: "desc" }, take: 5 },
      scanResult: true,
      indicators: { orderBy: { createdAt: "asc" } },
      feedback: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!scan) {
    throw new ServiceError("NOT_FOUND", "Scan not found.");
  }

  return scan;
}
