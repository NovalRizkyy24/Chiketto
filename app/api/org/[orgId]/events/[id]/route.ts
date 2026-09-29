import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { updateEvent } from "@/lib/events";
import { orgRoute } from "@/lib/org-route";

export async function PATCH(req: Request, { params }: { params: Promise<{ orgId: string; id: string }> }) {
  try {
    const { user, event } = await orgRoute(params);
    return NextResponse.json({ event: await updateEvent(event!.id, user.id, await req.json()) });
  } catch (err) {
    return handleApiError(err);
  }
}
