import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";

/** Status order, dipakai halaman checkout untuk polling. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const user = await requireUser();
    const { code } = await params;
    const order = await db.order.findUnique({
      where: { code },
      select: { userId: true, code: true, status: true, total: true, expiresAt: true, _count: { select: { tickets: true } } },
    });
    if (!order || order.userId !== user.id) throw new NotFoundError("Pesanan");
    return NextResponse.json(
      {
        code: order.code,
        status: order.status,
        total: order.total,
        expiresAt: order.expiresAt.toISOString(),
        ticketCount: order._count.tickets,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
