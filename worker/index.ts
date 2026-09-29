import "./env";
import { Worker } from "bullmq";
import { QUEUE_NAME, queue, type JobMap } from "@/lib/queue";
import { bullConnection } from "@/lib/redis";
import { expireOrders } from "@/lib/orders/release-order";
import { sendTicketEmail } from "./jobs/send-ticket-email";

async function main() {
  // Job terjadwal: batalkan order kedaluwarsa setiap menit.
  await queue().upsertJobScheduler("expire-orders-every-minute", { every: 60_000 }, { name: "expire-orders" });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      switch (job.name as keyof JobMap) {
        case "expire-orders": {
          const n = await expireOrders();
          if (n > 0) console.log(`[expire-orders] ${n} order kedaluwarsa, kuota dikembalikan`);
          return n;
        }
        case "send-ticket-email": {
          const { orderId } = job.data as JobMap["send-ticket-email"];
          return sendTicketEmail(orderId);
        }
        default:
          throw new Error(`Job tidak dikenal: ${job.name}`);
      }
    },
    { connection: bullConnection(), concurrency: 5 },
  );

  worker.on("failed", (job, err) => console.error(`[worker] ${job?.name} gagal (percobaan ${job?.attemptsMade})`, err));
  console.log("[worker] berjalan, menunggu job…");

  const shutdown = async () => {
    await worker.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
