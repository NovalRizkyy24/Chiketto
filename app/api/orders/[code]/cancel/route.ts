import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { cancelOrderByBuyer } from "@/lib/orders/release-order";
import { requireUser } from "@/lib/permissions";

export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const user = await requireUser();
    await cancelOrderByBuyer(user.id, (await params).code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
