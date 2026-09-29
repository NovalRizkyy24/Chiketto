import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { NotFoundError } from "@/lib/errors";
import { getPublicEvent } from "@/lib/events";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const e = await getPublicEvent((await params).slug);
    if (!e) throw new NotFoundError("Event");
    return NextResponse.json({
      id: e.id,
      slug: e.slug,
      title: e.title,
      category: e.category,
      description: e.description,
      posterUrl: e.posterUrl,
      venue: e.venue,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      status: e.status,
      maxPerUser: e.maxPerUser,
      organizer: e.org.name,
      ticketTypes: e.ticketTypes.map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price,
        quota: t.quota,
        remaining: Math.max(0, t.quota - t.sold - t.reserved),
        studentOnly: t.studentOnly,
        salesStart: t.salesStart,
        salesEnd: t.salesEnd,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
