import { File as NodeFile } from "node:buffer";
import { createHash } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AnalysisPriority, FileStatus, Role, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { inspectUpload } from "@/lib/security/file-validation";
import { queueFileAnalysisRequest } from "@/lib/services/analysis/analysis-service";
import { writeQuarantineFile } from "@/lib/services/storage/quarantine-storage";

type CalibrationEntry = {
  filename: string;
  category: string;
  expectedVerdict: string;
  expectedRules: string[];
  mimeType?: string;
  description: string;
};

const datasetId = "malviz-calibration-v1";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");
const fixtureDir = path.join(repoRoot, "backend/tests/fixtures/calibration");
const manifestPath = path.join(fixtureDir, "manifest.json");

async function main() {
  const entries = JSON.parse(await readFile(manifestPath, "utf8")) as CalibrationEntry[];
  const analyst = await prisma.user.findUnique({ where: { email: "analyst@malviz.local" } });

  if (!analyst || analyst.role !== Role.USER) {
    throw new Error("Demo Analyst is missing. Run `bun run db:seed` first.");
  }

  await removeExistingDataset(entries.map((entry) => entry.filename));

  let queued = 0;
  for (const entry of entries) {
    const sourcePath = path.join(fixtureDir, entry.filename);
    const bytes = await readFile(sourcePath);
    const fileForInspection = new NodeFile([bytes], entry.filename, {
      type: entry.mimeType ?? "application/octet-stream",
    });
    const inspection = await inspectUpload(fileForInspection as unknown as File, Buffer.from(bytes));
    const stored = await writeQuarantineFile(inspection.extension, Buffer.from(bytes));

    await prisma.$transaction(async (tx) => {
      const file = await tx.file.create({
        data: {
          userId: analyst.id,
          originalFilename: inspection.originalFilename,
          storedFilename: stored.storedFilename,
          md5: inspection.md5,
          sha1: inspection.sha1,
          sha256: inspection.sha256,
          mimeType: inspection.detectedMime,
          fileSize: bytes.byteLength,
          storagePath: stored.storagePath,
          status: FileStatus.UPLOADED,
        },
      });

      const queuedAnalysis = await queueFileAnalysisRequest({
        tx,
        file,
        user: analyst,
        priority: AnalysisPriority.NORMAL,
        requestedModules: ["static"],
        source: datasetId,
      });

      await tx.file.update({
        where: { id: file.id },
        data: { status: FileStatus.QUEUED },
      });

      await tx.auditLog.create({
        data: {
          userId: analyst.id,
          action: "dataset.seeded",
          entityType: "file",
          entityId: file.id,
          metadata: {
            datasetId,
            category: entry.category,
            expectedVerdict: entry.expectedVerdict,
            expectedRules: entry.expectedRules,
            description: entry.description,
            sourceFixture: entry.filename,
            scanJobId: queuedAnalysis.scanJob.id,
            analysisRequestId: queuedAnalysis.analysisRequest.id,
            artefactId: queuedAnalysis.artefact.id,
            sha256: createHash("sha256").update(bytes).digest("hex"),
          } satisfies Prisma.InputJsonValue,
        },
      });
    });

    queued += 1;
  }

  console.log(`Seeded ${queued} calibration sample(s).`);
  console.log("The Python worker will process queued scan jobs if it is running.");
}

async function removeExistingDataset(filenames: string[]) {
  const existing = await prisma.file.findMany({
    where: { originalFilename: { in: filenames } },
    select: {
      id: true,
      storagePath: true,
      scanJobs: { select: { analysisRequestId: true } },
    },
  });

  if (existing.length === 0) return;

  const fileIds = existing.map((file) => file.id);
  const analysisRequestIds = existing.flatMap((file) =>
    file.scanJobs
      .map((job) => job.analysisRequestId)
      .filter((id): id is string => Boolean(id)),
  );

  await prisma.$transaction(async (tx) => {
    if (analysisRequestIds.length) {
      await tx.analysisRequest.deleteMany({ where: { id: { in: analysisRequestIds } } });
    }

    await tx.auditLog.deleteMany({
      where: {
        entityType: "file",
        entityId: { in: fileIds },
      },
    });

    await tx.file.deleteMany({ where: { id: { in: fileIds } } });
  });

  await Promise.all(
    existing.map(async (file) => {
      if (!file.storagePath.startsWith("/tmp/malviz-quarantine/")) return;
      await unlink(file.storagePath).catch(() => undefined);
    }),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

