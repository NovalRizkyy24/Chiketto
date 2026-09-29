import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Antrean email tidak diuji di sini; jangan sentuh Redis.
vi.mock("@/lib/queue", () => ({ enqueue: vi.fn(), queue: vi.fn() }));

import { db } from "@/lib/db";
import { QuotaUnavailableError } from "@/lib/errors";
import { createOrder } from "@/lib/orders/create-order";
import { applyPaymentStatus } from "@/lib/orders/handle-payment";
import { cancelOrderByBuyer, expireOrders } from "@/lib/orders/release-order";
import { makeEvent, makeUsers, truncateAll } from "./fixtures";

const settlement = (code: string, total: number, txId = `tx-${code}`) => ({
  order_id: code,
  status_code: "200",
  gross_amount: `${total}.00`,
  transaction_status: "settlement",
  transaction_id: txId,
  payment_type: "qris",
});

beforeEach(truncateAll);
afterAll(() => db.$disconnect());

describe("rebutan kuota", () => {
  it("50 checkout bersamaan untuk kuota 10 → tepat 10 berhasil", async () => {
    const { event, ticketType } = await makeEvent({ quota: 10, price: 35_000 });
    const users = await makeUsers(50);

    const results = await Promise.allSettled(
      users.map((u) => createOrder(u.id, { eventId: event.id, items: [{ ticketTypeId: ticketType.id, qty: 1 }] })),
    );

    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(10);
    expect(failed).toHaveLength(40);
    for (const f of failed) expect(f.reason).toBeInstanceOf(QuotaUnavailableError);

    const tt = await db.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } });
    expect(tt.reserved).toBe(10);
    expect(tt.sold).toBe(0);
    expect(await db.order.count({ where: { status: "PENDING" } })).toBe(10);
  });

  it("klik ganda dari akun yang sama tidak menembus batas beli per akun", async () => {
    const { event, ticketType } = await makeEvent({ quota: 100, price: 20_000, maxPerUser: 2 });
    const [u] = await makeUsers(1);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => createOrder(u.id, { eventId: event.id, items: [{ ticketTypeId: ticketType.id, qty: 1 }] })),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    const tt = await db.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } });
    expect(tt.reserved).toBe(2);
  });

  it("tiket khusus mahasiswa ditolak untuk akun belum terverifikasi", async () => {
    const { event, ticketType } = await makeEvent({ quota: 10, price: 20_000, studentOnly: true });
    const [u] = await makeUsers(1);
    await expect(
      createOrder(u.id, { eventId: event.id, items: [{ ticketTypeId: ticketType.id, qty: 1 }] }),
    ).rejects.toThrow(/khusus mahasiswa/);
  });
});

describe("webhook pembayaran", () => {
  it("webhook lunas dikirim 3 kali → tiket hanya terbit sekali", async () => {
    const { event, ticketType } = await makeEvent({ quota: 10, price: 35_000 });
    const [u] = await makeUsers(1);
    const order = await createOrder(u.id, { eventId: event.id, items: [{ ticketTypeId: ticketType.id, qty: 2 }] });

    const outcomes = await Promise.all([1, 2, 3].map(() => applyPaymentStatus(settlement(order.code, order.total))));

    expect(outcomes.filter((o) => o === "paid")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "already-paid")).toHaveLength(2);
    expect(await db.ticket.count({ where: { orderId: order.id } })).toBe(2);
    expect(await db.payment.count({ where: { orderId: order.id } })).toBe(1);

    const tt = await db.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } });
    expect(tt).toMatchObject({ reserved: 0, sold: 2 });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
  });

  it("nominal yang tidak cocok tidak menerbitkan tiket", async () => {
    const { event, ticketType } = await makeEvent({ quota: 10, price: 35_000 });
    const [u] = await makeUsers(1);
    const order = await createOrder(u.id, { eventId: event.id, items: [{ ticketTypeId: ticketType.id, qty: 1 }] });

    expect(await applyPaymentStatus(settlement(order.code, 1))).toBe("amount-mismatch");
    expect(await db.ticket.count()).toBe(0);
  });

  it("status expire dari Midtrans mengembalikan kuota", async () => {
    const { event, ticketType } = await makeEvent({ quota: 10, price: 35_000 });
    const [u] = await makeUsers(1);
    const order = await createOrder(u.id, { eventId: event.id, items: [{ ticketTypeId: ticketType.id, qty: 3 }] });

    await applyPaymentStatus({ ...settlement(order.code, order.total), transaction_status: "expire" });

    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("EXPIRED");
    expect((await db.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } })).reserved).toBe(0);
  });

  it("tiket gratis langsung terbit tanpa pembayaran", async () => {
    const { event, ticketType } = await makeEvent({ quota: 10, price: 0 });
    const [u] = await makeUsers(1);
    const order = await createOrder(u.id, { eventId: event.id, items: [{ ticketTypeId: ticketType.id, qty: 2 }] });

    expect(order.status).toBe("PAID");
    expect(await db.ticket.count({ where: { orderId: order.id, status: "ACTIVE" } })).toBe(2);
    expect(await db.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } })).toMatchObject({ sold: 2, reserved: 0 });
  });
});

describe("order kedaluwarsa", () => {
  it("job expire-orders mengembalikan kuota", async () => {
    const { event, ticketType } = await makeEvent({ quota: 5, price: 35_000 });
    const [a, b] = await makeUsers(2);
    const order = await createOrder(a.id, { eventId: event.id, items: [{ ticketTypeId: ticketType.id, qty: 2 }] });
    await createOrder(b.id, { eventId: event.id, items: [{ ticketTypeId: ticketType.id, qty: 1 }] });
    await db.order.update({ where: { id: order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    expect(await expireOrders()).toBe(1);
    expect(await expireOrders()).toBe(0); // idempoten

    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("EXPIRED");
    expect((await db.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } })).reserved).toBe(1);
  });

  it("pembayaran yang masuk setelah kedaluwarsa tetap diterbitkan bila kuota masih ada", async () => {
    const { event, ticketType } = await makeEvent({ quota: 5, price: 35_000 });
    const [u] = await makeUsers(1);
    const order = await createOrder(u.id, { eventId: event.id, items: [{ ticketTypeId: ticketType.id, qty: 1 }] });
    await db.order.update({ where: { id: order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expireOrders();

    expect(await applyPaymentStatus(settlement(order.code, order.total))).toBe("paid");
    expect(await db.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } })).toMatchObject({ sold: 1, reserved: 0 });
  });

  it("pembayaran setelah kedaluwarsa dicatat untuk refund bila kuota sudah habis", async () => {
    const { event, ticketType } = await makeEvent({ quota: 1, price: 35_000 });
    const [a, b] = await makeUsers(2);
    const late = await createOrder(a.id, { eventId: event.id, items: [{ ticketTypeId: ticketType.id, qty: 1 }] });
    await db.order.update({ where: { id: late.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expireOrders();
    const winner = await createOrder(b.id, { eventId: event.id, items: [{ ticketTypeId: ticketType.id, qty: 1 }] });
    await applyPaymentStatus(settlement(winner.code, winner.total));

    expect(await applyPaymentStatus(settlement(late.code, late.total))).toBe("needs-refund");
    expect(await db.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } })).toMatchObject({ sold: 1, reserved: 0 });
    expect(await db.auditLog.count({ where: { action: "order.paid_without_quota", targetId: late.id } })).toBe(1);
  });

  it("pembeli membatalkan order → kuota kembali", async () => {
    const { event, ticketType } = await makeEvent({ quota: 5, price: 35_000 });
    const [u] = await makeUsers(1);
    const order = await createOrder(u.id, { eventId: event.id, items: [{ ticketTypeId: ticketType.id, qty: 2 }] });
    await cancelOrderByBuyer(u.id, order.code);
    expect((await db.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } })).reserved).toBe(0);
  });
});
