import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { availabilityOf } from "@/lib/events";
import { verifyMidtransSignature } from "@/lib/midtrans";
import { classifyMidtransStatus } from "@/lib/orders/handle-payment";
import { assertPurchaseLimit, calculateOrderTotal, mergeLines, remainingAllowance } from "@/lib/orders/rules";

describe("total order", () => {
  it("menjumlahkan qty × harga satuan", () => {
    expect(calculateOrderTotal([{ qty: 2, unitPrice: 35_000 }, { qty: 1, unitPrice: 50_000 }])).toBe(120_000);
  });
  it("tiket gratis bertotal nol", () => {
    expect(calculateOrderTotal([{ qty: 3, unitPrice: 0 }])).toBe(0);
  });
  it("menggabungkan baris jenis tiket yang sama", () => {
    expect(mergeLines([{ ticketTypeId: "a", qty: 1 }, { ticketTypeId: "a", qty: 2 }, { ticketTypeId: "b", qty: 1 }])).toEqual([
      { ticketTypeId: "a", qty: 3 },
      { ticketTypeId: "b", qty: 1 },
    ]);
  });
});

describe("batas beli per akun", () => {
  it("mengizinkan sampai batas", () => {
    expect(() => assertPurchaseLimit(2, 2, 4)).not.toThrow();
  });
  it("menolak bila melebihi batas, dengan sisa jatah di pesan", () => {
    expect(() => assertPurchaseLimit(3, 2, 4)).toThrow(/masih bisa membeli 1 tiket/);
  });
  it("menolak bila jatah sudah habis", () => {
    expect(() => assertPurchaseLimit(4, 1, 4)).toThrow(/sudah mencapai batas 4/);
  });
  it("menolak pesanan kosong", () => {
    expect(() => assertPurchaseLimit(0, 0, 4)).toThrow();
  });
  it("sisa jatah tidak pernah negatif", () => {
    expect(remainingAllowance(6, 4)).toBe(0);
  });
});

describe("ketersediaan", () => {
  it("sisa sedikit bila ≤ 20% kuota", () => {
    expect(availabilityOf([{ quota: 100, sold: 75, reserved: 5 }]).status).toBe("sisa-sedikit");
    expect(availabilityOf([{ quota: 100, sold: 70, reserved: 5 }]).status).toBe("tersedia");
    expect(availabilityOf([{ quota: 10, sold: 8, reserved: 2 }]).status).toBe("habis");
  });
});

describe("Midtrans", () => {
  it("klasifikasi status transaksi", () => {
    expect(classifyMidtransStatus("settlement")).toBe("paid");
    expect(classifyMidtransStatus("capture", "accept")).toBe("paid");
    expect(classifyMidtransStatus("capture", "challenge")).toBe("pending");
    expect(classifyMidtransStatus("expire")).toBe("expired");
    expect(classifyMidtransStatus("deny")).toBe("cancelled");
    expect(classifyMidtransStatus("pending")).toBe("pending");
    expect(classifyMidtransStatus("refund")).toBe("ignored");
  });

  it("memverifikasi signature_key SHA-512", () => {
    const key = "SB-Mid-server-test";
    const n = { order_id: "CHK-24A7Q9", status_code: "200", gross_amount: "35000.00", transaction_status: "settlement", transaction_id: "t1" };
    const signature_key = createHash("sha512").update(`${n.order_id}${n.status_code}${n.gross_amount}${key}`).digest("hex");
    expect(verifyMidtransSignature({ ...n, signature_key }, key)).toBe(true);
    expect(verifyMidtransSignature({ ...n, gross_amount: "1.00", signature_key }, key)).toBe(false);
    expect(verifyMidtransSignature({ ...n }, key)).toBe(false);
  });
});
