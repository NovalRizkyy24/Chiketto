import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { requireUser } from "@/lib/permissions";
import { scannableEvents } from "@/lib/scan";

export async function GET() {
  try {
    const user = await requireUser();
    const events = await scannableEvents(user.id);
    return NextResponse.json({
      events: events.map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt, venue: e.venue, org: e.org.name })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
