import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db, TX_OPTIONS } from "../db";
import { audit } from "../audit";
import { generateOrderCode } from "../codes";
import { AppError, NotFoundError } from "../errors";
import { enqueue } from "../queue";
import { markOrderPaid } from "./issue-tickets";
import { reserveQuota } from "./reserve-quota";
import {
  ORDER_HOLD_MINUTES,
  assertPurchaseLimit,
  calculateOrderTotal,
  isStudentVerified,
  mergeLines,
} from "./rules";

export const createOrderSchema = z.object({
  eventId: z.string().min(1),
  items: z
    .array(z.object({ ticketTypeId: z.string().min(1), qty: z.number().int().min(0).max(20) }))
    .min(1, "Pilih minimal satu tiket."),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Jumlah tiket yang sudah dipegang akun untuk event: tiket aktif + order yang masih menunggu bayar. */
export async function countHeldTickets(tx: Prisma.TransactionClient, userId: string, eventId: string) {
  const [tickets, pending] = await Promise.all([
    tx.ticket.count({ where: { ownerId: userId, eventId, status: { in: ["ACTIVE", "CHECKED_IN"] } } }),
    tx.orderItem.aggregate({
      _sum: { qty: true },
      where: { order: { userId, eventId, status: "PENDING", expiresAt: { gt: new Date() } } },
    }),
  ]);
  return tickets + (pending._sum.qty ?? 0);
}

async function uniqueOrderCode(tx: Prisma.TransactionClient) {
  for (;;) {
    const code = generateOrderCode();
    if (!(await tx.order.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
}

export async function createOrder(userId: string, input: CreateOrderInput) {
  const parsed = createOrderSchema.parse(input);
  const lines = mergeLines(parsed.items).filter((l) => l.qty > 0);
  if (lines.length === 0) throw new AppError("Pilih minimal satu tiket.");

  const order = await db.$transaction(async (tx) => {
    // Kunci baris user: pesanan paralel dari akun yang sama diproses bergantian,
    // sehingga batas beli per akun tidak bisa diakali dengan klik ganda.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    const event = await tx.event.findUnique({ where: { id: parsed.eventId }, include: { ticketTypes: true } });
    if (!event || event.status !== "PUBLISHED") throw new NotFoundError("Event");
    if (event.endsAt < new Date()) throw new AppError("Event ini sudah berakhir.", 409);

    const requested = lines.reduce((s, l) => s + l.qty, 0);
    assertPurchaseLimit(await countHeldTickets(tx, userId, event.id), requested, event.maxPerUser);

    const priced = lines.map((l) => {
      const tt = event.ticketTypes.find((t) => t.id === l.ticketTypeId);
      if (!tt) throw new NotFoundError("Jenis tiket");
      if (tt.studentOnly && !isStudentVerified(user)) {
        throw new AppError(
          `Tiket ${tt.name} khusus mahasiswa. Verifikasi email kampus kamu dulu untuk membelinya.`,
          403,
          "STUDENT_ONLY",
        );
      }
      return { ...l, unitPrice: tt.price, name: tt.name };
    });

    for (const l of priced) await reserveQuota(tx, l.ticketTypeId, l.qty, { ticketTypeName: l.name });

    const total = calculateOrderTotal(priced);
    const created = await tx.order.create({
      data: {
        code: await uniqueOrderCode(tx),
        userId,
        eventId: event.id,
        total,
        expiresAt: new Date(Date.now() + ORDER_HOLD_MINUTES * 60_000),
        items: {
          create: priced.map((l) => ({ ticketTypeId: l.ticketTypeId, qty: l.qty, unitPrice: l.unitPrice })),
        },
      },
    });
    await audit("order.created", created.id, { client: tx, actorId: userId, meta: { total, requested } });

    // Tiket gratis: langsung terbit tanpa pembayaran.
    if (total === 0) await markOrderPaid(tx, created.id, { free: true });

    return tx.order.findUniqueOrThrow({ where: { id: created.id } });
  }, TX_OPTIONS);

  if (order.status === "PAID") {
    await enqueue("send-ticket-email", { orderId: order.id }, { jobId: `ticket-email-${order.id}` });
  }
  return order;
}
