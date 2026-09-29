import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { requireUser } from "@/lib/permissions";
import { myTickets } from "@/lib/tickets";

export async function GET() {
  try {
    const user = await requireUser();
    const { active, history } = await myTickets(user.id);
    const shape = (t: (typeof active)[number]) => ({
      code: t.code,
      status: t.status,
      holderName: t.holderName,
      checkedInAt: t.checkedInAt,
      qrToken: t.status === "VOID" ? null : t.token,
      ticketType: { name: t.ticketType.name, price: t.ticketType.price },
      event: { slug: t.event.slug, title: t.event.title, startsAt: t.event.startsAt, venue: t.event.venue },
      orderCode: t.order.code,
    });
    return NextResponse.json({ active: active.map(shape), history: history.map(shape) });
  } catch (err) {
    return handleApiError(err);
  }
}
