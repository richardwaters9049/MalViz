import { FileStatus, JobStatus, type Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { enforceRateLimit, uploadRateLimitKey } from "@/lib/security/rate-limit";
import { ServiceError } from "@/lib/services/errors";
import { enqueueScanJob } from "@/lib/services/queue/scan-queue";
import { removeQuarantineFile, writeQuarantineFile } from "@/lib/services/storage/quarantine-storage";
import { inspectUpload } from "@/lib/services/uploads/upload-validation";
import type { UploadFailure, UploadResult, UploadSuccess } from "@/lib/services/uploads/upload-types";

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
    let storagePath: string | null = null;

    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      const inspection = await inspectUpload(file, bytes);
      const stored = await writeQuarantineFile(inspection.extension, bytes);
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
            fileSize: bytes.byteLength,
            storagePath: stored.storagePath,
            status: FileStatus.QUEUED,
          },
        });

        const scanJob = await tx.scanJob.create({
          data: {
            fileId: fileRecord.id,
            status: JobStatus.QUEUED,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "file.uploaded",
            entityType: "file",
            entityId: fileRecord.id,
            metadata: {
              originalFilename: inspection.originalFilename,
              size: bytes.byteLength,
              warnings: inspection.warnings,
            } satisfies Prisma.InputJsonValue,
          },
        });

        return { fileRecord, scanJob };
      });

      const warnings = [...inspection.warnings];
      try {
        await enqueueScanJob({
          scanJobId: created.scanJob.id,
          fileId: created.fileRecord.id,
          storagePath: stored.storagePath,
        });
      } catch (queueError) {
        warnings.push(
          "Redis enqueue failed, but the scan job is safely queued in PostgreSQL for the Python worker.",
        );
        console.error("Failed to enqueue BullMQ scan job", queueError);
      }

      uploads.push({
        fileId: created.fileRecord.id,
        scanJobId: created.scanJob.id,
        originalFilename: created.fileRecord.originalFilename,
        status: created.fileRecord.status,
        warnings,
      });
    } catch (error) {
      if (storagePath) {
        // If the database or queue phase fails, delete the orphaned quarantined sample.
        await removeQuarantineFile(storagePath);
      }

      failures.push({
        filename: file.name || "unnamed",
        error: error instanceof ServiceError || error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }

  return { uploads, failures };
}
