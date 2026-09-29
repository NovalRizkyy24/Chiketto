import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { createOrder } from "@/lib/orders/create-order";
import { requireUser } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    await rateLimit(`checkout:${user.id}`, 10, 60);
    const order = await createOrder(user.id, await req.json());
    return NextResponse.json({ code: order.code, status: order.status, total: order.total }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
