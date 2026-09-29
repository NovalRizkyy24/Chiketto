import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { saveTicketType } from "@/lib/events";
import { orgRoute } from "@/lib/org-route";

type Ctx = { params: Promise<{ orgId: string; id: string }> };

/** Tambah jenis tiket. */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { user, event } = await orgRoute(params);
    const tt = await saveTicketType(event!.id, user.id, await req.json());
    return NextResponse.json({ ticketType: tt }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Ubah jenis tiket: body berisi `id` + field yang sama dengan POST. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { user, event } = await orgRoute(params);
    const { id, ...body } = await req.json();
    if (!id) throw new AppError("Sertakan id jenis tiket.");
    return NextResponse.json({ ticketType: await saveTicketType(event!.id, user.id, body, String(id)) });
  } catch (err) {
    return handleApiError(err);
  }
}
