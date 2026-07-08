import {
  AnalysisPriority,
  AnalysisRequestStatus,
  ArtefactType,
  JobStatus,
  type File as StoredFile,
  type Prisma,
} from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";
import {
  analysisPrioritySchema,
  artefactTypeSchema,
  type ArtefactType as ArtefactTypeContract,
} from "@/shared/contracts";
import { ServiceError } from "@/lib/services/errors";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

type FileArtefactInput = Pick<
  StoredFile,
  "id" | "originalFilename" | "sha256" | "mimeType" | "fileSize" | "storagePath"
>;

type QueueFileAnalysisInput = {
  tx: Prisma.TransactionClient;
  file: FileArtefactInput;
  user: Pick<SessionUser, "id">;
  priority?: AnalysisPriority;
  requestedModules?: string[];
  source: string;
};

const artefactAnalysisBodySchema = z.object({
  value: z.string().min(1),
  displayName: z.string().min(1).optional(),
  priority: analysisPrioritySchema.default("NORMAL"),
  requestedModules: z.array(z.string().min(1)).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export async function ensureFileArtefact(
  tx: Prisma.TransactionClient,
  file: FileArtefactInput,
  userId: string,
) {
  return tx.artefact.upsert({
    where: { fileId: file.id },
    create: {
      userId,
      type: ArtefactType.FILE,
      value: file.sha256,
      displayName: file.originalFilename,
      fileId: file.id,
      metadata: fileArtefactMetadata(file),
    },
    update: {
      userId,
      value: file.sha256,
      displayName: file.originalFilename,
      metadata: fileArtefactMetadata(file),
    },
  });
}

export async function queueFileAnalysisRequest({
  tx,
  file,
  user,
  priority = AnalysisPriority.NORMAL,
  requestedModules = [],
  source,
}: QueueFileAnalysisInput) {
  const artefact = await ensureFileArtefact(tx, file, user.id);
  const analysisRequest = await tx.analysisRequest.create({
    data: {
      artefactId: artefact.id,
      artefactType: ArtefactType.FILE,
      artefactReference: file.id,
      submittedById: user.id,
      priority,
      requestedModules,
      status: AnalysisRequestStatus.QUEUED,
    },
  });

  const scanJob = await tx.scanJob.create({
    data: {
      fileId: file.id,
      analysisRequestId: analysisRequest.id,
      status: JobStatus.QUEUED,
    },
  });

  return {
    artefact,
    analysisRequest,
    scanJob,
    auditMetadata: analysisAuditMetadata(analysisRequest.id, artefact.id, source),
  };
}

export function parseArtefactTypeSegment(value: string): ArtefactTypeContract {
  const normalized = value.toUpperCase();
  const parsed = artefactTypeSchema.safeParse(normalized);

  if (!parsed.success) {
    throw new ServiceError("VALIDATION_FAILED", "Unsupported artefact type.");
  }

  return parsed.data;
}

export async function submitArtefactAnalysisRequest(
  request: Request,
  user: SessionUser,
  artefactType: ArtefactTypeContract,
) {
  if (artefactType === "FILE") {
    throw new ServiceError("VALIDATION_FAILED", "Use a file upload or provide an existing fileId for file analysis.");
  }

  const body = await request.json().catch(() => {
    throw new ServiceError("MALFORMED_JSON", "Request body must be valid JSON.");
  });
  const parsed = artefactAnalysisBodySchema.safeParse(body);

  if (!parsed.success) {
    throw new ServiceError("VALIDATION_FAILED", "Invalid analysis request.", parsed.error.flatten());
  }

  const value = normalizeArtefactValue(artefactType, parsed.data.value);
  const priority = parsed.data.priority as AnalysisPriority;

  return prisma.$transaction(async (tx) => {
    const artefact = await tx.artefact.create({
      data: {
        userId: user.id,
        type: artefactType as ArtefactType,
        value,
        displayName: parsed.data.displayName,
        metadata: {
          ...parsed.data.metadata,
          submittedVia: "api_v1",
        },
      },
    });

    const analysisRequest = await tx.analysisRequest.create({
      data: {
        artefactId: artefact.id,
        artefactType: artefact.type,
        artefactReference: artefact.value,
        submittedById: user.id,
        priority,
        requestedModules: parsed.data.requestedModules,
        status: AnalysisRequestStatus.QUEUED,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "analysis.requested",
        entityType: "analysis_request",
        entityId: analysisRequest.id,
        metadata: {
          artefactId: artefact.id,
          artefactType: artefact.type,
          queuedForWorker: false,
          note: "Non-file artefact requests are stored for the Phase 3 pipeline extension point.",
        },
      },
    });

    return { artefact, analysisRequest };
  });
}

export async function getApiReport(user: SessionUser, id: string) {
  const report = await prisma.scanResult.findFirst({
    where: {
      OR: [{ id }, { fileId: id }],
      ...(user.role === "ADMIN" ? {} : { file: { userId: user.id } }),
    },
    include: {
      file: {
        include: {
          artefact: true,
          indicators: { orderBy: { createdAt: "asc" } },
          scanJobs: { orderBy: { createdAt: "desc" }, take: 1, include: { analysisRequest: true } },
        },
      },
    },
  });

  if (!report) {
    throw new ServiceError("NOT_FOUND", "Report not found.");
  }

  return report;
}

export async function getApiArtefact(user: SessionUser, id: string) {
  const artefact = await prisma.artefact.findFirst({
    where: {
      id,
      ...(user.role === "ADMIN" ? {} : { userId: user.id }),
    },
    include: {
      analysisRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      indicators: { orderBy: { createdAt: "asc" } },
      reputations: { orderBy: { observedAt: "desc" }, take: 10 },
    },
  });

  if (!artefact) {
    throw new ServiceError("NOT_FOUND", "Artefact not found.");
  }

  return artefact;
}

export async function getApiIndicator(user: SessionUser, id: string) {
  const indicator = await prisma.indicator.findFirst({
    where: {
      id,
      ...(user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { file: { userId: user.id } },
              { artefact: { userId: user.id } },
              { analysisRequest: { submittedById: user.id } },
            ],
          }),
    },
  });

  if (!indicator) {
    throw new ServiceError("NOT_FOUND", "Indicator not found.");
  }

  return indicator;
}

export async function markAnalysisRequestStatus(
  tx: Prisma.TransactionClient,
  analysisRequestId: string | null | undefined,
  status: AnalysisRequestStatus,
) {
  if (!analysisRequestId) return;

  await tx.analysisRequest.update({
    where: { id: analysisRequestId },
    data: {
      status,
      completedAt:
        status === AnalysisRequestStatus.COMPLETED || status === AnalysisRequestStatus.FAILED
          ? new Date()
          : null,
    },
  });
}

function fileArtefactMetadata(file: FileArtefactInput): Prisma.InputJsonValue {
  return {
    sha256: file.sha256,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    storage: "quarantine",
    storagePath: file.storagePath,
  };
}

function analysisAuditMetadata(analysisRequestId: string, artefactId: string, source: string) {
  return {
    analysisRequestId,
    artefactId,
    artefactType: ArtefactType.FILE,
    source,
  };
}

function normalizeArtefactValue(artefactType: ArtefactTypeContract, value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new ServiceError("VALIDATION_FAILED", "Artefact value is required.");
  }

  if (artefactType === "HASH") return trimmed.toLowerCase();
  if (artefactType === "DOMAIN" || artefactType === "EMAIL") return trimmed.toLowerCase();

  return trimmed;
}
