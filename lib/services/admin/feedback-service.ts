import { FeedbackLabel } from "@prisma/client";
import { z } from "zod";
import type { SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { ServiceError } from "@/lib/services/errors";

const feedbackSchema = z.object({
  fileId: z.string().uuid(),
  label: z.enum(FeedbackLabel),
  comment: z.string().max(2_000).optional(),
});

export async function createAdminFeedback(request: Request, user: SessionUser) {
  const json = await request.json().catch(() => {
    throw new ServiceError("MALFORMED_JSON", "Request body must be valid JSON.");
  });
  const payload = feedbackSchema.safeParse(json);

  if (!payload.success) {
    throw new ServiceError("VALIDATION_FAILED", "Feedback payload is invalid.", payload.error.flatten());
  }

  return prisma.$transaction(async (tx) => {
    const feedback = await tx.feedback.create({
      data: {
        fileId: payload.data.fileId,
        userId: user.id,
        label: payload.data.label,
        comment: payload.data.comment,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "admin.feedback.created",
        entityType: "file",
        entityId: payload.data.fileId,
        metadata: payload.data,
      },
    });

    return feedback;
  });
}
