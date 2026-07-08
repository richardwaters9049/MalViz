import { z } from "zod";
import { indicatorSchema } from "./indicator";

export const verdicts = ["CLEAN", "SUSPICIOUS", "MALICIOUS", "UNKNOWN", "FAILED"] as const;
export const verdictSchema = z.enum(verdicts);

export const findingSchema = z.object({
  name: z.string().min(1),
  source: z.string().min(1),
  description: z.string().optional(),
  severity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("INFO"),
  evidence: z.record(z.string(), z.unknown()).default({}),
});

export const riskScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  verdict: verdictSchema,
  reasons: z.array(z.string()).default([]),
  matchedRules: z.array(z.string()).default([]),
});

export const structuredReportSchema = z.object({
  schemaVersion: z.number().int().positive(),
  overview: z.record(z.string(), z.unknown()).default({}),
  riskSummary: riskScoreSchema,
  evidence: z.array(findingSchema).default([]),
  indicators: z.array(indicatorSchema).default([]),
  relationships: z.array(z.record(z.string(), z.unknown())).default([]),
  threatIntelligence: z.record(z.string(), z.unknown()).default({}),
  recommendations: z.array(z.string()).default([]),
  technicalDetails: z.record(z.string(), z.unknown()).default({}),
  timeline: z.array(z.record(z.string(), z.unknown())).default([]),
});

export type VerdictContract = z.infer<typeof verdictSchema>;
export type FindingContract = z.infer<typeof findingSchema>;
export type RiskScoreContract = z.infer<typeof riskScoreSchema>;
export type StructuredReportContract = z.infer<typeof structuredReportSchema>;
