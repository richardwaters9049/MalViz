import { z } from "zod";
import { analysisPrioritySchema } from "./analysis";
import { artefactTypeSchema } from "./artefact";

export const queuePayloadSchema = z.object({
  requestId: z.string().uuid(),
  scanJobId: z.string().uuid(),
  artefactId: z.string().uuid().optional(),
  artefactType: artefactTypeSchema,
  artefactReference: z.string().min(1),
  priority: analysisPrioritySchema.default("NORMAL"),
  requestedModules: z.array(z.string().min(1)).default([]),
});

export type QueuePayloadContract = z.infer<typeof queuePayloadSchema>;
