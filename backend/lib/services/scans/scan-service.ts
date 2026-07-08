import { AnalysisRequestStatus, FileStatus, JobStatus, type Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import {
  markAnalysisRequestStatus,
  queueFileAnalysisRequest,
} from "@/lib/services/analysis/analysis-service";
import { ServiceError } from "@/lib/services/errors";
import { triggerWorkerOnce } from "@/lib/services/worker/worker-trigger";

const STALE_SCAN_MS = 2 * 60 * 1000;

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

export async function startScan(user: SessionUser, id: string) {
  const result = await prisma.$transaction(async (tx) => {
    const file = await tx.file.findFirst({
      where: {
        id,
        ...ownerFilter(user),
      },
      include: {
        scanJobs: {
          where: { status: { in: [JobStatus.QUEUED, JobStatus.SCANNING] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!file) {
      throw new ServiceError("NOT_FOUND", "Scan not found.");
    }

    const activeJob = file.scanJobs[0];
    if (activeJob) {
      const isStaleScanning =
        activeJob.status === JobStatus.SCANNING &&
        activeJob.startedAt &&
        Date.now() - activeJob.startedAt.getTime() > STALE_SCAN_MS;

      if (isStaleScanning) {
        const scanJob = await tx.scanJob.update({
          where: { id: activeJob.id },
          data: {
            status: JobStatus.QUEUED,
            startedAt: null,
            errorMessage: "Recovered stale scan job.",
          },
        });

        await markAnalysisRequestStatus(tx, scanJob.analysisRequestId, AnalysisRequestStatus.QUEUED);

        await tx.file.update({
          where: { id: file.id },
          data: { status: FileStatus.QUEUED },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "scan.requeued",
            entityType: "file",
            entityId: file.id,
            metadata: {
              scanJobId: scanJob.id,
              analysisRequestId: scanJob.analysisRequestId,
              reason: "stale_scanning_job",
            } satisfies Prisma.InputJsonValue,
          },
        });

        return {
          file,
          scanJob,
          created: false,
          shouldTriggerWorker: true,
          warnings: ["Recovered a stale scan job and queued it again."],
        };
      }

      return {
        file,
        scanJob: activeJob,
        created: false,
        shouldTriggerWorker: activeJob.status === JobStatus.QUEUED,
        warnings: activeJob.status === JobStatus.QUEUED
          ? ["This file is already queued. The worker will be kicked again."]
          : ["This file is already being scanned."],
      };
    }

    const scanableStatuses: FileStatus[] = [FileStatus.UPLOADED, FileStatus.FAILED];
    if (!scanableStatuses.includes(file.status)) {
      throw new ServiceError(
        "VALIDATION_FAILED",
        "This file already has a completed or active report.",
      );
    }

    const queued = await queueFileAnalysisRequest({
      tx,
      file,
      user,
      source: "manual_scan_button",
    });

    await tx.file.update({
      where: { id: file.id },
      data: { status: FileStatus.QUEUED },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "scan.queued",
        entityType: "file",
        entityId: file.id,
        metadata: {
          scanJobId: queued.scanJob.id,
          ...queued.auditMetadata,
        } satisfies Prisma.InputJsonValue,
      },
    });

    return {
      file,
      scanJob: queued.scanJob,
      created: true,
      shouldTriggerWorker: true,
      warnings: [] as string[],
    };
  });

  const warnings = [...result.warnings];

  if (result.shouldTriggerWorker) {
    // scan_jobs is the durable queue; this only wakes a local one-shot worker.
    const trigger = triggerWorkerOnce();
    if (!trigger.triggered) {
      warnings.push(trigger.warning ?? "Scan worker could not be started automatically.");
    }
  }

  return {
    fileId: result.file.id,
    scanJobId: result.scanJob.id,
    status: result.scanJob.status === JobStatus.QUEUED ? FileStatus.QUEUED : result.file.status,
    created: result.created,
    warnings,
  };
}
