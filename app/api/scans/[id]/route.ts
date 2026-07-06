import { requireUser } from "@/lib/auth/session";
import { apiData, apiError } from "@/lib/services/api-response";
import { getScanDetail } from "@/lib/services/scans/scan-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();

  try {
    const { id } = await context.params;
    const scan = await getScanDetail(user, id);

    return apiData({ scan });
  } catch (error) {
    return apiError(error);
  }
}
