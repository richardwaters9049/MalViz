import { z } from "zod";
import { artefactTypeSchema } from "./artefact";

export const analysisPriorities = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const;
export const analysisRequestStatuses = ["QUEUED", "SCANNING", "COMPLETED", "FAILED", "CANCELLED"] as const;

export const analysisPrioritySchema = z.enum(analysisPriorities);
export const analysisRequestStatusSchema = z.enum(analysisRequestStatuses);

export const analysisRequestSchema = z.object({
  requestId: z.string().uuid(),
  artefactType: artefactTypeSchema,
  artefactReference: z.string().min(1),
  submittedBy: z.string().uuid(),
  priority: analysisPrioritySchema.default("NORMAL"),
  requestedModules: z.array(z.string().min(1)).default([]),
  status: analysisRequestStatusSchema.default("QUEUED"),
  createdAt: z.string().datetime(),
});

export type AnalysisPriorityContract = z.infer<typeof analysisPrioritySchema>;
export type AnalysisRequestStatusContract = z.infer<typeof analysisRequestStatusSchema>;
export type AnalysisRequestContract = z.infer<typeof analysisRequestSchema>;
