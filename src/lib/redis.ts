import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let redisClient: Redis | null = null;
let isRedisAvailable = false;

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) return null; // stop reconnecting after 3 attempts
      return Math.min(times * 100, 1000);
    },
  });

  redisClient.connect().then(() => {
    isRedisAvailable = true;
    console.log("⚡ [Redis Cache] Connected to Redis server successfully!");
  }).catch(() => {
    isRedisAvailable = false;
    console.warn("⚠️ [Redis Cache] Redis server unavailable, fallback to DB mode.");
  });

  redisClient.on("error", () => {
    isRedisAvailable = false;
  });

  redisClient.on("ready", () => {
    isRedisAvailable = true;
  });
} catch {
  isRedisAvailable = false;
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redisClient || !isRedisAvailable) return null;
  try {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds = 600): Promise<void> {
  if (!redisClient || !isRedisAvailable) return;
  try {
    const serialized = JSON.stringify(value);
    await redisClient.set(key, serialized, "EX", ttlSeconds);
  } catch {}
}

export async function deleteCache(key: string): Promise<void> {
  if (!redisClient || !isRedisAvailable) return;
  try {
    await redisClient.del(key);
  } catch {}
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!redisClient || !isRedisAvailable) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch {}
}

export { redisClient, isRedisAvailable };
