import { Queue } from "bullmq";
import type { ScanJobPayload } from "@/lib/services/queue/queue-types";

let queue: Queue<ScanJobPayload, unknown, "scan-file"> | null = null;

function getScanQueue() {
  if (queue) return queue;

  const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  const connection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    password: redisUrl.password || undefined,
  };

  // Instantiate BullMQ only when enqueueing; builds import routes without needing Redis.
  queue = new Queue<ScanJobPayload, unknown, "scan-file">("scan-jobs", {
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

  return queue;
}

export const scanQueue = {
  add: (...args: Parameters<Queue<ScanJobPayload, unknown, "scan-file">["add"]>) =>
    getScanQueue().add(...args),
};

export async function enqueueScanJob(payload: ScanJobPayload) {
  return getScanQueue().add("scan-file", payload, {
    jobId: payload.scanJobId,
  });
}
