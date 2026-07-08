import { requireApiUser } from "@/lib/auth/session";
import { apiData, apiError } from "@/lib/services/api-response";
import {
  parseArtefactTypeSegment,
  submitArtefactAnalysisRequest,
} from "@/lib/services/analysis/analysis-service";
import { startScan } from "@/lib/services/scans/scan-service";
import { ServiceError } from "@/lib/services/errors";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ type: string }> },
) {
  try {
    const user = await requireApiUser();
    const { type } = await context.params;
    const artefactType = parseArtefactTypeSegment(type);

    if (artefactType === "FILE") {
      const body = await request.json().catch(() => {
        throw new ServiceError("MALFORMED_JSON", "Request body must be valid JSON.");
      });
      const fileId = typeof body?.fileId === "string" ? body.fileId : null;

      if (!fileId) {
        throw new ServiceError("VALIDATION_FAILED", "fileId is required for file analysis.");
      }

      const scan = await startScan(user, fileId);
      return apiData({ analysis: scan }, { status: scan.created ? 201 : 200 });
    }

    const analysis = await submitArtefactAnalysisRequest(request, user, artefactType);

    return apiData(
      {
        analysis,
        warnings: ["This artefact type is recorded for the Phase 3 pipeline; worker execution currently supports files."],
      },
      { status: 202 },
    );
  } catch (error) {
    return apiError(error);
  }
}
