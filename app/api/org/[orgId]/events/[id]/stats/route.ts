import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { eventStats } from "@/lib/events";
import { orgRoute } from "@/lib/org-route";

export async function GET(_req: Request, { params }: { params: Promise<{ orgId: string; id: string }> }) {
  try {
    const { event } = await orgRoute(params);
    const { event: _e, ...stats } = await eventStats(event!.id);
    return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleApiError(err);
  }
}
