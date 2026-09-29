import type { OrderStatus, Prisma } from "@prisma/client";
import { db, TX_OPTIONS } from "../db";
import { audit } from "../audit";
import { AppError } from "../errors";
import { enqueue } from "../queue";
import { appUrl } from "../email";
import {
  createSnapTransaction,
  fetchTransactionStatus,
  midtransEnabled,
  verifyMidtransSignature,
  type MidtransNotification,
} from "../midtrans";
import { markOrderPaid } from "./issue-tickets";
import { releaseOrder } from "./release-order";
import { releaseReserved, reserveQuota } from "./reserve-quota";
import { ORDER_HOLD_MINUTES } from "./rules";

export type PaymentKind = "paid" | "expired" | "cancelled" | "pending" | "ignored";

/** Terjemahkan status Midtrans ke keputusan kita. */
export function classifyMidtransStatus(transactionStatus: string, fraudStatus?: string): PaymentKind {
  switch (transactionStatus) {
    case "settlement":
      return "paid";
    case "capture":
      return !fraudStatus || fraudStatus === "accept" ? "paid" : "pending";
    case "expire":
      return "expired";
    case "cancel":
    case "deny":
    case "failure":
      return "cancelled";
    case "pending":
      return "pending";
    default:
      return "ignored"; // refund, chargeback, dll. ditangani manual
  }
}

export type PaymentOutcome =
  | "paid"
  | "already-paid"
  | "released"
  | "ignored"
  | "unknown-order"
  | "amount-mismatch"
  | "needs-refund";

/**
 * Terapkan status pembayaran yang SUDAH terverifikasi ke order.
 * Idempoten: webhook berulang untuk order yang sudah PAID tidak menerbitkan tiket lagi.
 */
export async function applyPaymentStatus(n: MidtransNotification): Promise<PaymentOutcome> {
  const kind = classifyMidtransStatus(n.transaction_status, n.fraud_status);

  const result = await db.$transaction(async (tx) => {
    // Kunci baris order agar webhook yang datang bersamaan diproses satu per satu.
    const rows = await tx.$queryRaw<{ id: string; status: OrderStatus; total: number }[]>`
      SELECT "id", "status", "total" FROM "Order" WHERE "code" = ${n.order_id} FOR UPDATE
    `;
    const order = rows[0];
    if (!order) return { outcome: "unknown-order" as const };

    if (n.transaction_id) {
      const data = {
        status: n.transaction_status,
        method: n.payment_type ?? null,
        rawPayload: n as unknown as Prisma.InputJsonValue,
      };
      await tx.payment.upsert({
        where: { gatewayRef: n.transaction_id },
        create: { orderId: order.id, gatewayRef: n.transaction_id, ...data },
        update: data,
      });
    }

    if (kind === "paid") {
      if (Math.round(Number(n.gross_amount)) !== order.total) {
        await audit("payment.amount_mismatch", order.id, { client: tx, meta: { gross: n.gross_amount } });
        return { outcome: "amount-mismatch" as const, orderId: order.id };
      }
      if (order.status === "PAID") return { outcome: "already-paid" as const, orderId: order.id };
      if (order.status === "PENDING") {
        await markOrderPaid(tx, order.id, { gatewayRef: n.transaction_id });
        return { outcome: "paid" as const, orderId: order.id };
      }
      if (order.status === "EXPIRED" || order.status === "CANCELLED") {
        return { outcome: await payAfterRelease(tx, order.id), orderId: order.id };
      }
      return { outcome: "ignored" as const, orderId: order.id };
    }

    if (kind === "expired" || kind === "cancelled") {
      const released = await releaseOrder(tx, order.id, kind === "expired" ? "EXPIRED" : "CANCELLED");
      return { outcome: released ? ("released" as const) : ("ignored" as const), orderId: order.id };
    }

    return { outcome: "ignored" as const, orderId: order.id };
  }, TX_OPTIONS);

  if (result.outcome === "paid" && result.orderId) {
    await enqueue("send-ticket-email", { orderId: result.orderId }, { jobId: `ticket-email-${result.orderId}` });
  }
  return result.outcome;
}

/**
 * Pembayaran masuk setelah kuota sudah dilepas (order kedaluwarsa).
 * Coba tahan ulang kuotanya; bila sudah habis, catat untuk refund manual.
 */
async function payAfterRelease(tx: Prisma.TransactionClient, orderId: string): Promise<PaymentOutcome> {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  const done: typeof items = [];
  try {
    for (const item of items) {
      await reserveQuota(tx, item.ticketTypeId, item.qty, { ignoreSalesWindow: true });
      done.push(item);
    }
  } catch {
    for (const item of done) await releaseReserved(tx, item.ticketTypeId, item.qty);
    await audit("order.paid_without_quota", orderId, { client: tx });
    return "needs-refund";
  }
  await tx.order.update({ where: { id: orderId }, data: { status: "PENDING" } });
  await markOrderPaid(tx, orderId, { lateSettlement: true });
  return "paid";
}

/** Alur webhook: verifikasi signature → konfirmasi ulang ke API Midtrans → terapkan. */
export async function handleMidtransWebhook(payload: MidtransNotification): Promise<PaymentOutcome> {
  if (!verifyMidtransSignature(payload)) {
    throw new AppError("Signature tidak valid.", 403, "INVALID_SIGNATURE");
  }
  const confirmed = midtransEnabled() ? await fetchTransactionStatus(payload.order_id) : payload;
  return applyPaymentStatus({ ...confirmed, order_id: payload.order_id });
}

/** Buat (atau pakai ulang) sesi Snap untuk order PENDING berbayar. */
export async function ensureSnapToken(orderId: string) {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { include: { ticketType: true } }, user: true, event: true },
  });
  if (order.status !== "PENDING" || order.total === 0 || !midtransEnabled()) return order;
  if (order.snapToken) return order;

  try {
    const minutesLeft = Math.max(1, Math.ceil((order.expiresAt.getTime() - Date.now()) / 60_000));
    const snap = await createSnapTransaction({
      orderCode: order.code,
      total: order.total,
      items: order.items.map((i) => ({
        id: i.ticketTypeId,
        name: `${i.ticketType.name} · ${order.event.title}`,
        price: i.unitPrice,
        quantity: i.qty,
      })),
      customer: { name: order.user.name ?? order.user.email, email: order.user.email },
      expiryMinutes: Math.min(minutesLeft, ORDER_HOLD_MINUTES),
      finishUrl: appUrl(`/checkout/${order.code}`),
    });
    return db.order.update({
      where: { id: order.id },
      data: { snapToken: snap.token, snapRedirectUrl: snap.redirect_url },
      include: { items: { include: { ticketType: true } }, user: true, event: true },
    });
  } catch (err) {
    // Gateway gagal: lepas kuota supaya tidak tertahan sia-sia.
    await db.$transaction((tx) => releaseOrder(tx, order.id, "CANCELLED"), TX_OPTIONS);
    throw err;
  }
}
