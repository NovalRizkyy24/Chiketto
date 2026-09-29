import { db } from "./db";
import { audit } from "./audit";
import { normalizeTicketCode } from "./codes";
import { verifyQrToken } from "./qr-token";

export type CheckinVerdict = "VALID" | "SUDAH_DIPAKAI" | "BUKAN_EVENT_INI" | "TIDAK_DITEMUKAN";

export type CheckinResult = {
  verdict: CheckinVerdict;
  holderName?: string;
  ticketTypeName?: string;
  ticketCode?: string;
  checkedInAt?: string;
  checkedInByName?: string;
  otherEventTitle?: string;
  note?: string;
};

/**
 * Validasi & check-in tiket. Update memakai `checkedInAt IS NULL`, sehingga dua panitia
 * yang memindai tiket sama bersamaan tidak sama-sama mendapat "Valid".
 */
export async function checkIn(input: { token?: string; code?: string; eventId: string; crewUserId: string }) {
  let ticketId: string | null = null;
  if (input.token) ticketId = verifyQrToken(input.token);

  const ticket = ticketId
    ? await db.ticket.findUnique({ where: { id: ticketId }, include: { ticketType: true, event: true } })
    : input.code
      ? await db.ticket.findUnique({
          where: { code: normalizeTicketCode(input.code) },
          include: { ticketType: true, event: true },
        })
      : null;

  if (!ticket) return { verdict: "TIDAK_DITEMUKAN" } satisfies CheckinResult;

  const base = { holderName: ticket.holderName, ticketTypeName: ticket.ticketType.name, ticketCode: ticket.code };

  if (ticket.eventId !== input.eventId) {
    return { verdict: "BUKAN_EVENT_INI", ...base, otherEventTitle: ticket.event.title } satisfies CheckinResult;
  }
  if (ticket.status === "VOID") {
    return { verdict: "TIDAK_DITEMUKAN", ...base, note: "Tiket ini sudah dibatalkan." } satisfies CheckinResult;
  }

  const now = new Date();
  const updated = await db.ticket.updateMany({
    where: { id: ticket.id, status: "ACTIVE", checkedInAt: null },
    data: { status: "CHECKED_IN", checkedInAt: now, checkedInBy: input.crewUserId },
  });

  if (updated.count === 1) {
    await audit("ticket.checkin", ticket.id, { actorId: input.crewUserId, meta: { eventId: input.eventId } });
    return { verdict: "VALID", ...base, checkedInAt: now.toISOString() } satisfies CheckinResult;
  }

  const again = await db.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: { checkedInByUser: true } });
  if (again.status === "VOID") {
    return { verdict: "TIDAK_DITEMUKAN", ...base, note: "Tiket ini sudah dibatalkan." } satisfies CheckinResult;
  }
  return {
    verdict: "SUDAH_DIPAKAI",
    ...base,
    checkedInAt: again.checkedInAt?.toISOString(),
    checkedInByName: again.checkedInByUser?.name ?? again.checkedInByUser?.email ?? undefined,
  } satisfies CheckinResult;
}

export async function checkinCounts(eventId: string) {
  const [checkedIn, total] = await Promise.all([
    db.ticket.count({ where: { eventId, status: "CHECKED_IN" } }),
    db.ticket.count({ where: { eventId, status: { in: ["ACTIVE", "CHECKED_IN"] } } }),
  ]);
  return { checkedIn, total };
}
