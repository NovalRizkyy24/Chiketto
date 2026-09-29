import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { availabilityOf, listPublicEvents, listQuerySchema } from "@/lib/events";

export async function GET(req: Request) {
  try {
    const params = listQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    const { events, total, page, pageSize } = await listPublicEvents(params);
    return NextResponse.json({
      total,
      page,
      pageSize,
      events: events.map((e) => ({
        id: e.id,
        slug: e.slug,
        title: e.title,
        category: e.category,
        venue: e.venue,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        organizer: e.org.name,
        minPrice: e.ticketTypes.length ? Math.min(...e.ticketTypes.map((t) => t.price)) : null,
        availability: availabilityOf(e.ticketTypes).status,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
