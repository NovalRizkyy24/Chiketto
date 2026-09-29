import { NextResponse } from "next/server";
import { clientIp, handleApiError } from "@/lib/api";
import { requireUser } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { requestStudentCode } from "@/lib/student-verification";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    await rateLimit(`student-code:${user.id}`, 3, 600);
    await rateLimit(`student-code-ip:${clientIp(req)}`, 10, 600);
    const { email } = await requestStudentCode(user.id, await req.json());
    return NextResponse.json({ ok: true, email });
  } catch (err) {
    return handleApiError(err);
  }
}
