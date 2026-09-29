import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { createEvent } from "@/lib/events";
import { orgRoute } from "@/lib/org-route";

type Ctx = { params: Promise<{ orgId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { org } = await orgRoute(params);
    const events = await db.event.findMany({ where: { orgId: org.id }, orderBy: { startsAt: "desc" } });
    return NextResponse.json({ events });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Buat event (draft). Tanggal memakai format `YYYY-MM-DDTHH:mm` zona WIB. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { user, org } = await orgRoute(params);
    const event = await createEvent(org.id, user.id, await req.json());
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
