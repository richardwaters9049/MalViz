import { FileStatus, type Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { enforceRateLimit, uploadRateLimitKey } from "@/lib/security/rate-limit";
import { inspectUpload } from "@/lib/security/file-validation";
import { ensureFileArtefact } from "@/lib/services/analysis/analysis-service";
import { ServiceError } from "@/lib/services/errors";
import { removeQuarantineFile, writeQuarantineFile } from "@/lib/services/storage/quarantine-storage";
import type { UploadFailure, UploadResult, UploadSuccess } from "@/lib/services/uploads/upload-types";
import { expandZipUpload } from "@/lib/services/uploads/zip-expansion";

type UploadCandidate = {
  filename: string;
  bytes: Buffer;
  mimeType: string;
  sourceArchive?: string;
  archivePath?: string;
};

export async function handleUpload(request: Request, user: SessionUser): Promise<UploadResult> {
  await enforceRateLimit({
    key: uploadRateLimitKey(request, user.id),
    limit: 20,
    windowMs: 60_000,
  });

  const formData = await request.formData().catch(() => {
    throw new ServiceError("BAD_REQUEST", "Upload request must be multipart form data.");
  });
  const submittedFiles = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File);

  if (submittedFiles.length === 0) {
    throw new ServiceError("BAD_REQUEST", "No files were provided.", {
      failures: [{ filename: "files", error: "No files were provided." }],
    });
  }

  const uploads: UploadSuccess[] = [];
  const failures: UploadFailure[] = [];

  for (const file of submittedFiles) {
    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      const inspection = await inspectUpload(file, bytes);

      if (inspection.extension === ".zip") {
        const expanded = expandZipUpload(inspection.originalFilename, bytes);
        failures.push(...expanded.failures);

        for (const entry of expanded.entries) {
          await persistUploadCandidate(
            {
              filename: entry.filename,
              bytes: entry.bytes,
              mimeType: "application/octet-stream",
              sourceArchive: inspection.originalFilename,
              archivePath: entry.archivePath,
            },
            user,
            uploads,
            failures,
          );
        }

        continue;
      }

      await persistUploadCandidate(
        {
          filename: file.name,
          bytes,
          mimeType: file.type || "application/octet-stream",
        },
        user,
        uploads,
        failures,
      );
    } catch (error) {
      failures.push({
        filename: file.name || "unnamed",
        error: error instanceof ServiceError || error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }

  return { uploads, failures };
}

async function persistUploadCandidate(
  candidate: UploadCandidate,
  user: SessionUser,
  uploads: UploadSuccess[],
  failures: UploadFailure[],
) {
  let storagePath: string | null = null;

  try {
    const fileForInspection = {
      name: candidate.filename,
      type: candidate.mimeType,
    } as File;
    const inspection = await inspectUpload(fileForInspection, candidate.bytes);
    const stored = await writeQuarantineFile(inspection.extension, candidate.bytes);
    storagePath = stored.storagePath;

    const created = await prisma.$transaction(async (tx) => {
      const fileRecord = await tx.file.create({
        data: {
          userId: user.id,
          originalFilename: inspection.originalFilename,
          storedFilename: stored.storedFilename,
          md5: inspection.md5,
          sha1: inspection.sha1,
          sha256: inspection.sha256,
          mimeType: inspection.detectedMime,
          fileSize: candidate.bytes.byteLength,
          storagePath: stored.storagePath,
          status: FileStatus.UPLOADED,
        },
      });

      const artefact = await ensureFileArtefact(tx, fileRecord, user.id);
      const warnings = uploadWarnings(inspection.warnings, candidate);

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "file.uploaded",
          entityType: "file",
          entityId: fileRecord.id,
          metadata: {
            artefactId: artefact.id,
            artefactType: artefact.type,
            originalFilename: inspection.originalFilename,
            size: candidate.bytes.byteLength,
            sourceArchive: candidate.sourceArchive,
            archivePath: candidate.archivePath,
            warnings,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return { fileRecord, warnings };
    });

    uploads.push({
      fileId: created.fileRecord.id,
      scanJobId: null,
      originalFilename: created.fileRecord.originalFilename,
      status: created.fileRecord.status,
      warnings: created.warnings,
    });
  } catch (error) {
    if (storagePath) {
      // If persistence fails after quarantine write, delete the orphaned sample.
      const removed = await removeQuarantineFile(storagePath);
      if (!removed) {
        console.warn("Could not remove orphaned quarantine file", { storagePath });
      }
    }

    failures.push({
      filename: candidate.sourceArchive ? `${candidate.sourceArchive}:${candidate.archivePath ?? candidate.filename}` : candidate.filename,
      error: error instanceof ServiceError || error instanceof Error ? error.message : "Upload failed.",
    });
  }
}

function uploadWarnings(warnings: string[], candidate: UploadCandidate) {
  const allWarnings = [...warnings];
  if (candidate.sourceArchive) {
    allWarnings.push(`Extracted from ZIP archive ${candidate.sourceArchive}.`);
  }

  return allWarnings;
}
