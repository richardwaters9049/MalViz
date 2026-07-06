import { requireAdmin } from "@/lib/auth/session";
import { apiData, apiError } from "@/lib/services/api-response";
import { createAdminFeedback } from "@/lib/services/admin/feedback-service";

export async function POST(request: Request) {
  const user = await requireAdmin();

  try {
    const feedback = await createAdminFeedback(request, user);
    return apiData({ feedback }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
