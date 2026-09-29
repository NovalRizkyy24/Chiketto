import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api";
import { checkIn, checkinCounts } from "@/lib/checkin";
import { ForbiddenError } from "@/lib/errors";
import { canScanEvent, requireUser } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";

const schema = z
  .object({
    eventId: z.string().min(1),
    token: z.string().max(200).optional(),
    code: z.string().max(20).optional(),
  })
  .refine((v) => v.token || v.code, "Kirim token QR atau kode tiket.");

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await req.json());
    if (!(await canScanEvent(user.id, input.eventId))) throw new ForbiddenError();
    await rateLimit(`checkin:${user.id}`, 120, 60);
    const result = await checkIn({ ...input, crewUserId: user.id });
    return NextResponse.json({ ...result, counts: await checkinCounts(input.eventId) });
  } catch (err) {
    return handleApiError(err);
  }
}
