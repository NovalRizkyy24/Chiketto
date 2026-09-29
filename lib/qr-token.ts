import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.QR_SECRET;
  if (!s || s.length < 16) throw new Error("QR_SECRET belum diatur (minimal 16 karakter).");
  return s;
}

function sign(ticketId: string): Buffer {
  return createHmac("sha256", secret()).update(ticketId).digest();
}

/** `base64url(ticketId).base64url(HMAC-SHA256(ticketId, QR_SECRET))` */
export function createQrToken(ticketId: string): string {
  return `${Buffer.from(ticketId).toString("base64url")}.${sign(ticketId).toString("base64url")}`;
}

/** Mengembalikan ticketId bila tanda tangan sah, selain itu `null`. */
export function verifyQrToken(token: string): string | null {
  const segments = token.trim().split(".");
  if (segments.length !== 2) return null;
  const [idPart, sigPart] = segments;
  if (!idPart || !sigPart) return null;
  const ticketId = Buffer.from(idPart, "base64url").toString("utf8");
  const given = Buffer.from(sigPart, "base64url");
  if (!ticketId) return null;
  const expected = sign(ticketId);
  if (given.length !== expected.length) return null;
  return timingSafeEqual(given, expected) ? ticketId : null;
}
