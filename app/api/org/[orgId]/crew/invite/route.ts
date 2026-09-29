import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { inviteCrew } from "@/lib/crew";
import { orgRoute } from "@/lib/org-route";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { user, org } = await orgRoute(params);
    await rateLimit(`invite:${user.id}`, 20, 600);
    const invited = await inviteCrew(org.id, user.id, await req.json());
    return NextResponse.json({ userId: invited.id, email: invited.email }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
