import { requireApiUser } from "@/lib/auth/session";
import { apiData, apiError } from "@/lib/services/api-response";
import { getApiReport } from "@/lib/services/analysis/analysis-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const report = await getApiReport(user, id);

    return apiData({ report });
  } catch (error) {
    return apiError(error);
  }
}
