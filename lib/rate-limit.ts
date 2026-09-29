import { AppError } from "./errors";
import { redis } from "./redis";

/**
 * Fixed-window rate limit di Redis. Bila Redis tidak bisa dihubungi,
 * permintaan tetap diizinkan (fail-open) supaya checkout tidak ikut mati.
 */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  let count: number;
  try {
    const k = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
    const r = redis();
    count = await r.incr(k);
    if (count === 1) await r.expire(k, windowSec);
  } catch {
    console.warn(`[rate-limit] Redis tidak tersedia, ${key} tidak dibatasi.`);
    return;
  }
  if (count > limit) {
    throw new AppError("Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.", 429, "RATE_LIMITED");
  }
}
