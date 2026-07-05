import { Queue } from "bullmq";

export type ScanJobPayload = {
  scanJobId: string;
  fileId: string;
  storagePath: string;
};

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  password: redisUrl.password || undefined,
};

export const scanQueue = new Queue<ScanJobPayload, unknown, "scan-file">("scan-jobs", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: 500,
    removeOnFail: 1_000,
  },
});

export async function enqueueScanJob(payload: ScanJobPayload) {
  return scanQueue.add("scan-file", payload, {
    jobId: payload.scanJobId,
  });
}
