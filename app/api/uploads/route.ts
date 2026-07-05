import { unlink } from "node:fs/promises";
import { NextResponse } from "next/server";
import { FileStatus, JobStatus } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { enqueueScanJob } from "@/lib/queue/scan-queue";
import { writeQuarantineFile } from "@/lib/storage/quarantine";
import { inspectUpload } from "@/lib/validation/upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const submittedFiles = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File);

  if (submittedFiles.length === 0) {
    return NextResponse.json(
      { uploads: [], failures: [{ filename: "files", error: "No files were provided." }] },
      { status: 400 },
    );
  }

  const uploads = [];
  const failures = [];

  for (const file of submittedFiles) {
    let storagePath: string | null = null;

    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      const inspection = await inspectUpload(file, bytes);
      const storedFilename = `${uuidv4()}${inspection.extension || ".bin"}`;
      storagePath = await writeQuarantineFile(storedFilename, bytes);

      const created = await prisma.$transaction(async (tx) => {
        const fileRecord = await tx.file.create({
          data: {
            userId: user.id,
            originalFilename: inspection.originalFilename,
            storedFilename,
            sha256: inspection.sha256,
            mimeType: inspection.detectedMime,
            fileSize: bytes.byteLength,
            storagePath: storagePath!,
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
            },
          },
        });

        return { fileRecord, scanJob };
      });

      const warnings = [...inspection.warnings];
      try {
        await enqueueScanJob({
          scanJobId: created.scanJob.id,
          fileId: created.fileRecord.id,
          storagePath,
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
        await unlink(storagePath).catch(() => undefined);
      }

      failures.push({
        filename: file.name || "unnamed",
        error: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }

  const status = uploads.length > 0 ? 201 : 400;
  return NextResponse.json({ uploads, failures }, { status });
}
