import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { paymentMockEnabled } from "@/lib/midtrans";
import { applyPaymentStatus } from "@/lib/orders/handle-payment";
import { requireUser } from "@/lib/permissions";

/**
 * HANYA untuk pengembangan lokal tanpa kunci Midtrans: menyimulasikan
 * notifikasi `settlement` lewat jalur yang sama dengan webhook asli.
 */
export async function POST(req: Request) {
  try {
    if (!paymentMockEnabled()) throw new NotFoundError("Halaman");
    const user = await requireUser();
    const { code, result } = (await req.json()) as { code: string; result?: "settlement" | "expire" };
    const order = await db.order.findUnique({ where: { code } });
    if (!order || order.userId !== user.id) throw new NotFoundError("Pesanan");
    if (order.status !== "PENDING") throw new AppError("Pesanan ini tidak menunggu pembayaran.", 409);

    const outcome = await applyPaymentStatus({
      order_id: order.code,
      status_code: "200",
      gross_amount: `${order.total}.00`,
      transaction_status: result ?? "settlement",
      transaction_id: `MOCK-${order.code}`,
      payment_type: "mock",
    });
    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
    return handleApiError(err);
  }
}
