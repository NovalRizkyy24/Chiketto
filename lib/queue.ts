import { Queue, type JobsOptions } from "bullmq";
import { bullConnection } from "./redis";

export const QUEUE_NAME = "chiketto";

export type JobMap = {
  "expire-orders": Record<string, never>;
  "send-ticket-email": { orderId: string };
};

const g = globalThis as unknown as { queue?: Queue };

export function queue(): Queue {
  g.queue ??= new Queue(QUEUE_NAME, {
    connection: bullConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
  return g.queue;
}

/**
 * Masukkan job ke antrean. `jobId` membuat job idempoten: job dengan id sama
 * tidak akan dimasukkan dua kali. Kegagalan Redis dicatat, tidak dilempar,
 * karena status pesanan di database tetap menjadi sumber kebenaran.
 */
export async function enqueue<K extends keyof JobMap>(name: K, data: JobMap[K], opts: JobsOptions = {}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // BullMQ menunggu koneksi tanpa batas; jangan biarkan request pengguna ikut menggantung.
    await Promise.race([
      queue().add(name, data, opts),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Redis tidak merespons dalam 3 detik")), 3000);
      }),
    ]);
  } catch (err) {
    console.error(`[queue] gagal memasukkan job ${name}:`, err instanceof Error ? err.message : err);
  } finally {
    clearTimeout(timer);
  }
}
