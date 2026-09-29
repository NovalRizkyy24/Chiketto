import IORedis from "ioredis";

const url = () => process.env.REDIS_URL ?? "redis://localhost:6379";

const g = globalThis as unknown as { redis?: IORedis; bullRedis?: IORedis };

/** Koneksi untuk perintah biasa (rate limit). Gagal cepat saat Redis mati. */
let warned = false;
const warnOnce = (err: Error) => {
  if (warned) return;
  warned = true;
  console.warn(`[redis] tidak bisa terhubung ke ${url()}: ${err.message}`);
};

export function redis(): IORedis {
  if (!g.redis) {
    g.redis = new IORedis(url(), { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1 });
    g.redis.on("error", warnOnce);
  }
  if (g.redis.status === "wait") g.redis.connect().catch(() => {});
  return g.redis;
}

/** Koneksi untuk BullMQ (butuh maxRetriesPerRequest: null). */
export function bullConnection(): IORedis {
  if (!g.bullRedis) {
    g.bullRedis = new IORedis(url(), { maxRetriesPerRequest: null });
    g.bullRedis.on("error", warnOnce);
  }
  return g.bullRedis;
}
