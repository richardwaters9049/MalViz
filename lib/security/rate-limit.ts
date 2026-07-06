import { ServiceError } from "@/lib/services/errors";
import Redis from "ioredis";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
let redisClient: Redis | null | undefined;

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

function getRedisClient() {
  if (redisClient !== undefined) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  redisClient = redisUrl ? new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 }) : null;
  return redisClient;
}

export async function enforceRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const redis = getRedisClient();

  if (redis) {
    try {
      if (redis.status === "wait") {
        await redis.connect();
      }

      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }

      if (count > limit) {
        const ttl = await redis.pttl(key);
        throw new ServiceError("RATE_LIMITED", "Too many requests. Try again shortly.", {
          retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)),
        });
      }

      return;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      console.warn("Redis rate limit unavailable; falling back to in-memory limiter.", error);
    }
  }

  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  current.count += 1;

  if (current.count > limit) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    throw new ServiceError("RATE_LIMITED", "Too many requests. Try again shortly.", {
      retryAfterSeconds,
    });
  }
}

export function uploadRateLimitKey(request: Request, userId: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const client = forwardedFor || request.headers.get("x-real-ip") || "local";

  // Uploads are expensive and hostile by default, so key by both user and client hint.
  return `upload:${userId}:${client}`;
}
