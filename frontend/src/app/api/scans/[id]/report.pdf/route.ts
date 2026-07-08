import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { requireApiUser } from "@/lib/auth/session";
import { apiError } from "@/lib/services/api-response";
import { ServiceError } from "@/lib/services/errors";
import { getScanDetail } from "@/lib/services/scans/scan-service";
import { formatBytes } from "@/lib/utils";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let workDir: string | null = null;

  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const scan = await getScanDetail(user, id);

    if (!scan.scanResult) {
      throw new ServiceError("VALIDATION_FAILED", "A completed report is required before PDF export.");
    }

    workDir = await mkdtemp(join(tmpdir(), "malviz-report-"));
    const inputPath = join(workDir, "report.json");
    const outputPath = join(workDir, "report.pdf");
    const rendererPath = join(process.cwd(), "backend/scripts/reports/render_report_pdf.py");

    await writeFile(inputPath, JSON.stringify(pdfPayload(scan, user.name), null, 2), "utf-8");
    await execFileAsync("python3", [rendererPath, "--input", inputPath, "--out", outputPath], {
      timeout: 20_000,
      maxBuffer: 1024 * 1024,
    });

    const pdf = await readFile(outputPath);
    const filename = `${safeFilename(scan.originalFilename)}-malviz-report.pdf`;

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  } finally {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

type ScanDetail = Awaited<ReturnType<typeof getScanDetail>>;

function pdfPayload(scan: ScanDetail, generatedBy: string) {
  return {
    generated: {
      at: new Date().toISOString(),
      by: generatedBy,
    },
    file: {
      id: scan.id,
      originalFilename: scan.originalFilename,
      mimeType: scan.mimeType,
      fileSizeLabel: formatBytes(scan.fileSize),
      createdAt: scan.createdAt.toISOString(),
      ownerName: scan.user.name,
      sha256: scan.sha256,
      sha1: scan.sha1,
      md5: scan.md5,
    },
    result: {
      id: scan.scanResult?.id,
      verdict: scan.scanResult?.verdict,
      riskScore: scan.scanResult?.riskScore,
      summary: scan.scanResult?.summary,
      reasons: scan.scanResult?.reasons,
      matchedRules: scan.scanResult?.matchedRules,
      recommendedActions: scan.scanResult?.recommendedActions,
      staticFindings: scan.scanResult?.staticFindings,
      rawReportJson: scan.scanResult?.rawReportJson,
    },
    indicators: scan.indicators.map((indicator) => ({
      type: indicator.type,
      value: indicator.value,
      confidence: indicator.confidence,
      source: indicator.source,
      description: indicator.description,
    })),
  };
}

function safeFilename(value: string) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "scan";
}
