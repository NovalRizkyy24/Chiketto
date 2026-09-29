import type { Prisma } from "@prisma/client";
import { db, TX_OPTIONS } from "../db";
import { audit } from "../audit";
import { AppError, NotFoundError } from "../errors";
import { releaseReserved } from "./reserve-quota";

/**
 * Pindahkan order PENDING ke EXPIRED/CANCELLED dan kembalikan kuota.
 * Transisi bersyarat (`WHERE status = PENDING`), jadi aman bila bersamaan
 * dengan webhook lunas atau job lain: hanya satu yang menang.
 */
export async function releaseOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  status: "EXPIRED" | "CANCELLED",
  actorId?: string | null,
): Promise<boolean> {
  const updated = await tx.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status } });
  if (updated.count === 0) return false;
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) await releaseReserved(tx, item.ticketTypeId, item.qty);
  await audit(status === "EXPIRED" ? "order.expired" : "order.cancelled", orderId, { client: tx, actorId });
  return true;
}

/** Job `expire-orders`: batalkan order PENDING yang lewat `expiresAt`. */
export async function expireOrders(now = new Date()): Promise<number> {
  const due = await db.order.findMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    select: { id: true },
    take: 500,
  });
  let n = 0;
  for (const { id } of due) {
    const ok = await db.$transaction((tx) => releaseOrder(tx, id, "EXPIRED"), TX_OPTIONS);
    if (ok) n++;
  }
  return n;
}

/** Pembeli membatalkan order PENDING miliknya. */
export async function cancelOrderByBuyer(userId: string, code: string) {
  const order = await db.order.findUnique({ where: { code } });
  if (!order || order.userId !== userId) throw new NotFoundError("Pesanan");
  if (order.status !== "PENDING") throw new AppError("Pesanan ini tidak bisa dibatalkan lagi.", 409);
  await db.$transaction((tx) => releaseOrder(tx, order.id, "CANCELLED", userId), TX_OPTIONS);
}
