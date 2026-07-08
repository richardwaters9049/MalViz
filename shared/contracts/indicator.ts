import { z } from "zod";

export const indicatorTypes = [
  "IP",
  "DOMAIN",
  "URL",
  "EMAIL",
  "CERTIFICATE",
  "REGISTRY_KEY",
  "MUTEX",
  "PROCESS",
  "COMMAND",
  "HASH",
  "FILENAME",
  "FILE_PATH",
] as const;

export const indicatorTypeSchema = z.enum(indicatorTypes);

export const indicatorSchema = z.object({
  id: z.string().uuid().optional(),
  type: indicatorTypeSchema,
  value: z.string().min(1),
  confidence: z.number().int().min(0).max(100).default(50),
  source: z.string().min(1),
  description: z.string().optional(),
  relationships: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type IndicatorTypeContract = z.infer<typeof indicatorTypeSchema>;
export type IndicatorContract = z.infer<typeof indicatorSchema>;
