import { requireApiUser } from "@/lib/auth/session";
import { apiData, apiError } from "@/lib/services/api-response";
import { getApiIndicator } from "@/lib/services/analysis/analysis-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const indicator = await getApiIndicator(user, id);

    return apiData({ indicator });
  } catch (error) {
    return apiError(error);
  }
}
