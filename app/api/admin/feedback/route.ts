import { FeedbackLabel } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const feedbackSchema = z.object({
  fileId: z.string().uuid(),
  label: z.enum(FeedbackLabel),
  comment: z.string().max(2_000).optional(),
});

export async function POST(request: Request) {
  const user = await requireAdmin();
  const payload = feedbackSchema.parse(await request.json());

  const feedback = await prisma.feedback.create({
    data: {
      fileId: payload.fileId,
      userId: user.id,
      label: payload.label,
      comment: payload.comment,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "admin.feedback.created",
      entityType: "file",
      entityId: payload.fileId,
      metadata: payload,
    },
  });

  return NextResponse.json({ feedback }, { status: 201 });
}
