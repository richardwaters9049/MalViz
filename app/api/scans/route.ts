import { requireUser } from "@/lib/auth/session";
import { apiData, apiError } from "@/lib/services/api-response";
import { listScans, parseFileStatus } from "@/lib/services/scans/scan-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireUser();

  try {
    const { searchParams } = new URL(request.url);
    const scans = await listScans(user, parseFileStatus(searchParams.get("status")));

    return apiData({ scans });
  } catch (error) {
    return apiError(error);
  }
}
