import { redisClient, isRedisAvailable } from "@/lib/redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSec: number;
}

/**
 * High-performance Redis-based Sliding-Window / Fixed-Window Rate Limiter
 * Fails open if Redis is temporarily unreachable so students are never blocked due to cache issues.
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!redisClient || !isRedisAvailable) {
    return { allowed: true, remaining: limit, resetSec: 0 };
  }

  try {
    const key = `ratelimit:${identifier}`;
    const count = await redisClient.incr(key);

    if (count === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    const ttl = await redisClient.ttl(key);
    const resetSec = ttl > 0 ? ttl : windowSeconds;

    if (count > limit) {
      return { allowed: false, remaining: 0, resetSec };
    }

    return { allowed: true, remaining: Math.max(0, limit - count), resetSec };
  } catch (error) {
    console.error(`[RateLimiter] Redis error for ${identifier}:`, error);
    return { allowed: true, remaining: limit, resetSec: 0 };
  }
}
