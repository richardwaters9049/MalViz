import { requireUser } from "@/lib/auth/session";
import { apiError } from "@/lib/services/api-response";
import { handleUpload } from "@/lib/services/uploads/upload-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();

  try {
    const result = await handleUpload(request, user);
    const status = result.uploads.length > 0 ? 201 : 400;

    return Response.json(result, { status });
  } catch (error) {
    return apiError(error);
  }
}
