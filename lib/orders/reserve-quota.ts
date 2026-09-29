import type { Prisma } from "@prisma/client";
import { QuotaUnavailableError } from "../errors";

/**
 * Menahan kuota dengan SATU query atomik. Kondisi `sold + reserved + qty <= quota`
 * dievaluasi ulang oleh Postgres setelah row lock, jadi checkout paralel tidak
 * pernah bisa melewati kuota.
 */
export async function reserveQuota(
  tx: Prisma.TransactionClient,
  ticketTypeId: string,
  qty: number,
  opts: { ticketTypeName?: string; ignoreSalesWindow?: boolean } = {},
) {
  const updated = opts.ignoreSalesWindow
    ? await tx.$executeRaw`
        UPDATE "TicketType"
        SET "reserved" = "reserved" + ${qty}
        WHERE "id" = ${ticketTypeId}
          AND "sold" + "reserved" + ${qty} <= "quota"
      `
    : await tx.$executeRaw`
        UPDATE "TicketType"
        SET "reserved" = "reserved" + ${qty}
        WHERE "id" = ${ticketTypeId}
          AND "sold" + "reserved" + ${qty} <= "quota"
          AND (now() AT TIME ZONE 'UTC') BETWEEN "salesStart" AND "salesEnd"
      `;
  if (updated === 0) throw new QuotaUnavailableError(opts.ticketTypeName);
}

/** Kembalikan kuota yang ditahan (order kedaluwarsa/batal). */
export async function releaseReserved(tx: Prisma.TransactionClient, ticketTypeId: string, qty: number) {
  await tx.$executeRaw`
    UPDATE "TicketType" SET "reserved" = GREATEST("reserved" - ${qty}, 0) WHERE "id" = ${ticketTypeId}
  `;
}

/** Pindahkan kuota dari ditahan ke terjual (webhook lunas). */
export async function commitReserved(tx: Prisma.TransactionClient, ticketTypeId: string, qty: number) {
  await tx.$executeRaw`
    UPDATE "TicketType"
    SET "reserved" = GREATEST("reserved" - ${qty}, 0), "sold" = "sold" + ${qty}
    WHERE "id" = ${ticketTypeId}
  `;
}
