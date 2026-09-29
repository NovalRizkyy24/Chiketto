import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { publishEvent } from "@/lib/events";
import { orgRoute } from "@/lib/org-route";

export async function POST(_req: Request, { params }: { params: Promise<{ orgId: string; id: string }> }) {
  try {
    const { user, event } = await orgRoute(params);
    return NextResponse.json({ event: await publishEvent(event!.id, user.id) });
  } catch (err) {
    return handleApiError(err);
  }
}
