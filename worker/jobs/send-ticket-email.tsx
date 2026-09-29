import { render } from "@react-email/render";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { appUrl, sendMail } from "@/lib/email";
import { formatDateLong } from "@/lib/format-date";
import { formatRupiah } from "@/lib/format-rupiah";
import { createQrToken } from "@/lib/qr-token";
import { qrPng, ticketsForOrder } from "@/lib/tickets";
import { TicketEmail } from "@/emails/ticket-email";
import { renderTicketsPdf } from "@/pdf/ticket-pdf";

/** Kirim email e-tiket + PDF. Idempoten: dicatat di AuditLog dan dilewati bila sudah terkirim. */
export async function sendTicketEmail(orderId: string) {
  const sent = await db.auditLog.findFirst({ where: { action: "order.email_sent", targetId: orderId } });
  if (sent) return "skipped";

  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { user: true } });
  if (order.status !== "PAID") return "not-paid";
  const tickets = await ticketsForOrder(orderId);
  if (tickets.length === 0) throw new Error(`Order ${order.code} lunas tetapi belum punya tiket.`);

  const event = tickets[0].event;
  const tz = event.org.campus.timezone;
  const qrs = await Promise.all(tickets.map((t) => qrPng(createQrToken(t.id), 400)));
  const props = {
    eventTitle: event.title,
    dateLine: formatDateLong(event.startsAt, tz),
    venue: event.venue,
    orderCode: order.code,
    ticketsUrl: appUrl("/tiket-saya"),
    tickets: tickets.map((t) => ({
      code: t.code,
      typeName: t.ticketType.name,
      priceLabel: formatRupiah(t.ticketType.price),
      holderName: t.holderName,
      qrCid: `qr-${t.code}`,
    })),
  };

  await sendMail({
    to: order.user.email,
    subject: `🎫 E-tiket kamu: ${event.title}`,
    html: await render(<TicketEmail {...props} />),
    text: await render(<TicketEmail {...props} />, { plainText: true }),
    attachments: [
      { filename: `e-tiket-${order.code}.pdf`, content: await renderTicketsPdf(tickets), contentType: "application/pdf" },
      ...tickets.map((t, i) => ({
        filename: `qr-${t.code}.png`,
        content: qrs[i],
        contentType: "image/png",
        contentId: `qr-${t.code}`,
      })),
    ],
  });
  await audit("order.email_sent", orderId);
  return "sent";
}
