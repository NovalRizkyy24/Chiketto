import { createHash, timingSafeEqual } from "node:crypto";
import { AppError } from "./errors";

const isProduction = () => process.env.MIDTRANS_IS_PRODUCTION === "true";
const serverKey = () => process.env.MIDTRANS_SERVER_KEY ?? "";

export const snapScriptUrl = () =>
  isProduction() ? "https://app.midtrans.com/snap/snap.js" : "https://app.sandbox.midtrans.com/snap/snap.js";

const snapApi = () =>
  isProduction()
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

const coreApi = () => (isProduction() ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com");

export function midtransEnabled() {
  return Boolean(serverKey() && process.env.MIDTRANS_CLIENT_KEY);
}

/** Simulasi pembayaran untuk pengembangan lokal tanpa kunci Midtrans. */
export function paymentMockEnabled() {
  return !midtransEnabled() && process.env.PAYMENT_MOCK === "true" && process.env.NODE_ENV !== "production";
}

function authHeader() {
  return `Basic ${Buffer.from(`${serverKey()}:`).toString("base64")}`;
}

export type SnapItem = { id: string; name: string; price: number; quantity: number };

export async function createSnapTransaction(input: {
  orderCode: string;
  total: number;
  items: SnapItem[];
  customer: { name: string; email: string };
  expiryMinutes: number;
  finishUrl: string;
}): Promise<{ token: string; redirect_url: string }> {
  const res = await fetch(snapApi(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderCode, gross_amount: input.total },
      item_details: input.items.map((i) => ({ ...i, name: i.name.slice(0, 50) })),
      customer_details: { first_name: input.customer.name.slice(0, 50), email: input.customer.email },
      expiry: { unit: "minutes", duration: input.expiryMinutes },
      callbacks: { finish: input.finishUrl },
    }),
  });
  if (!res.ok) {
    console.error("[midtrans] snap gagal", res.status, await res.text());
    throw new AppError("Layanan pembayaran sedang bermasalah. Coba lagi sebentar lagi.", 502, "PAYMENT_GATEWAY");
  }
  return res.json();
}

export type MidtransNotification = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key?: string;
  transaction_status: string;
  transaction_id: string;
  fraud_status?: string;
  payment_type?: string;
  [key: string]: unknown;
};

/** SHA-512(order_id + status_code + gross_amount + server key) */
export function verifyMidtransSignature(n: MidtransNotification, key = serverKey()): boolean {
  if (!n.signature_key || !key) return false;
  const expected = createHash("sha512")
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${key}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(n.signature_key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Konfirmasi ulang status langsung ke API Midtrans (jangan percaya isi webhook begitu saja). */
export async function fetchTransactionStatus(orderCode: string): Promise<MidtransNotification> {
  const res = await fetch(`${coreApi()}/v2/${encodeURIComponent(orderCode)}/status`, {
    headers: { Accept: "application/json", Authorization: authHeader() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Midtrans status ${res.status}`);
  return res.json();
}
