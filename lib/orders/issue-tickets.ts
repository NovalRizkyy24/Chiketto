import type { Prisma } from "@prisma/client";
import { generateTicketCode } from "../codes";
import { audit } from "../audit";
import { commitReserved } from "./reserve-quota";

async function uniqueTicketCodes(tx: Prisma.TransactionClient, n: number): Promise<string[]> {
  const codes = new Set<string>();
  while (codes.size < n) {
    const batch = new Set<string>();
    while (batch.size < n - codes.size) batch.add(generateTicketCode());
    const taken = await tx.ticket.findMany({ where: { code: { in: [...batch] } }, select: { code: true } });
    const takenSet = new Set(taken.map((t) => t.code));
    for (const c of batch) if (!takenSet.has(c)) codes.add(c);
  }
  return [...codes];
}

/** Terbitkan tiket untuk order. Idempoten: tidak menerbitkan dua kali. */
export async function issueTickets(tx: Prisma.TransactionClient, orderId: string) {
  const existing = await tx.ticket.count({ where: { orderId } });
  if (existing > 0) return;

  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, user: true },
  });
  const holderName = order.user.name?.trim() || order.user.email.split("@")[0];
  const total = order.items.reduce((s, i) => s + i.qty, 0);
  const codes = await uniqueTicketCodes(tx, total);

  let k = 0;
  const data = order.items.flatMap((item) =>
    Array.from({ length: item.qty }, () => ({
      code: codes[k++],
      orderId: order.id,
      ticketTypeId: item.ticketTypeId,
      eventId: order.eventId,
      ownerId: order.userId,
      holderName,
    })),
  );
  await tx.ticket.createMany({ data });
}

/**
 * Tandai order lunas: kuota ditahan → terjual, terbitkan tiket.
 * Pemanggil wajib sudah mengunci baris order dan memastikan statusnya PENDING.
 */
export async function markOrderPaid(tx: Prisma.TransactionClient, orderId: string, meta?: Prisma.InputJsonValue) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) await commitReserved(tx, item.ticketTypeId, item.qty);
  await issueTickets(tx, orderId);
  await tx.order.update({ where: { id: orderId }, data: { status: "PAID", paidAt: new Date() } });
  await audit("order.paid", orderId, { client: tx, meta });
}
