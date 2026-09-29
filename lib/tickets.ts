import QRCode from "qrcode";
import { db } from "./db";
import { createQrToken } from "./qr-token";

// QR selalu gelap di atas terang, apa pun tema layar, agar tetap terbaca scanner.
export const QR_DARK = "#1c1f25";
export const QR_LIGHT = "#ece9e2";

export async function qrSvg(token: string): Promise<string> {
  return QRCode.toString(token, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 4,
    color: { dark: QR_DARK, light: QR_LIGHT },
  });
}

export async function qrPng(token: string, width = 480): Promise<Buffer> {
  return QRCode.toBuffer(token, {
    errorCorrectionLevel: "M",
    margin: 4,
    width,
    color: { dark: QR_DARK, light: "#ffffff" },
  });
}

const ticketInclude = {
  event: { include: { org: { include: { campus: true } } } },
  ticketType: true,
  order: true,
} as const;

export async function myTickets(userId: string) {
  const tickets = await db.ticket.findMany({
    where: { ownerId: userId },
    include: ticketInclude,
    orderBy: [{ event: { startsAt: "asc" } }, { createdAt: "asc" }],
  });
  const now = new Date();
  const withQr = await Promise.all(
    tickets.map(async (t) => {
      const token = createQrToken(t.id);
      return { ...t, token, svg: t.status === "VOID" ? null : await qrSvg(token) };
    }),
  );
  return {
    active: withQr.filter((t) => t.event.endsAt >= now && t.event.status !== "CANCELLED"),
    history: withQr.filter((t) => t.event.endsAt < now || t.event.status === "CANCELLED").reverse(),
  };
}

export async function ticketsForOrder(orderId: string) {
  return db.ticket.findMany({ where: { orderId }, include: ticketInclude, orderBy: { createdAt: "asc" } });
}

export type TicketWithRelations = Awaited<ReturnType<typeof ticketsForOrder>>[number];
