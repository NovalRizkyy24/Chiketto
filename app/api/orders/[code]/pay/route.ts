import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { midtransEnabled } from "@/lib/midtrans";
import { ensureSnapToken } from "@/lib/orders/handle-payment";
import { requireUser } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";

/** Buat/ambil token Snap untuk membuka popup pembayaran Midtrans. */
export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const user = await requireUser();
    await rateLimit(`pay:${user.id}`, 20, 60);
    const order = await db.order.findUnique({ where: { code: (await params).code } });
    if (!order || order.userId !== user.id) throw new NotFoundError("Pesanan");
    if (order.status !== "PENDING") throw new AppError("Pesanan ini tidak menunggu pembayaran.", 409);
    if (order.expiresAt < new Date()) throw new AppError("Waktu penahanan tiket sudah habis.", 410, "EXPIRED");
    if (!midtransEnabled()) throw new AppError("Pembayaran online belum dikonfigurasi.", 503, "PAYMENT_DISABLED");

    const updated = await ensureSnapToken(order.id);
    return NextResponse.json({ snapToken: updated.snapToken, redirectUrl: updated.snapRedirectUrl });
  } catch (err) {
    return handleApiError(err);
  }
}
