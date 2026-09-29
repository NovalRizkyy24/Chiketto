import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { requireUser } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { confirmStudentCode } from "@/lib/student-verification";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    await rateLimit(`student-confirm:${user.id}`, 10, 600);
    await confirmStudentCode(user.id, await req.json());
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
