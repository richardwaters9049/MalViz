import { requireApiUser } from "@/lib/auth/session";
import { apiData, apiError } from "@/lib/services/api-response";
import { getScanDetail, startScan } from "@/lib/services/scans/scan-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const scan = await getScanDetail(user, id);

    return apiData({ scan });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const scan = await startScan(user, id);

    return apiData({ scan }, { status: scan.created ? 201 : 200 });
  } catch (error) {
    return apiError(error);
  }
}
