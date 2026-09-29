import { AppError } from "../errors";

export const ORDER_HOLD_MINUTES = 15;

export type OrderLine = { ticketTypeId: string; qty: number; unitPrice: number };

export function calculateOrderTotal(lines: Pick<OrderLine, "qty" | "unitPrice">[]): number {
  return lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
}

/** Gabungkan baris dengan jenis tiket yang sama. */
export function mergeLines<T extends { ticketTypeId: string; qty: number }>(items: T[]) {
  const map = new Map<string, number>();
  for (const i of items) map.set(i.ticketTypeId, (map.get(i.ticketTypeId) ?? 0) + i.qty);
  return [...map].map(([ticketTypeId, qty]) => ({ ticketTypeId, qty }));
}

/** Sisa jatah beli akun untuk satu event. */
export function remainingAllowance(alreadyHeld: number, maxPerUser: number): number {
  return Math.max(0, maxPerUser - alreadyHeld);
}

/**
 * Batas beli per akun: tiket ACTIVE/CHECKED_IN + tiket di order PENDING
 * ditambah yang diminta tidak boleh melebihi `maxPerUser`.
 */
export function assertPurchaseLimit(alreadyHeld: number, requested: number, maxPerUser: number) {
  if (requested < 1) throw new AppError("Pilih minimal satu tiket.");
  const left = remainingAllowance(alreadyHeld, maxPerUser);
  if (requested > left) {
    throw new AppError(
      left === 0
        ? `Kamu sudah mencapai batas ${maxPerUser} tiket per akun untuk event ini.`
        : `Maksimal ${maxPerUser} tiket per akun. Kamu masih bisa membeli ${left} tiket lagi.`,
      409,
      "LIMIT_EXCEEDED",
    );
  }
}

export function isStudentVerified(user: { studentVerifiedAt: Date | null }) {
  return user.studentVerifiedAt !== null;
}
