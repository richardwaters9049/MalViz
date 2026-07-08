import { z } from "zod";

export const artefactTypes = ["FILE", "HASH", "URL", "DOMAIN", "IP", "EMAIL", "ARCHIVE"] as const;

export const artefactTypeSchema = z.enum(artefactTypes);

export const artefactSchema = z.object({
  id: z.string().uuid(),
  type: artefactTypeSchema,
  value: z.string().min(1),
  displayName: z.string().min(1).optional(),
  fileId: z.string().uuid().optional(),
});

export type ArtefactType = z.infer<typeof artefactTypeSchema>;
export type ArtefactContract = z.infer<typeof artefactSchema>;
