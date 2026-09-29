import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import type { MidtransNotification } from "@/lib/midtrans";
import { handleMidtransWebhook } from "@/lib/orders/handle-payment";

/**
 * Notifikasi pembayaran Midtrans. Status lunas HANYA ditentukan di sini
 * (signature diverifikasi + status dikonfirmasi ulang ke API Midtrans),
 * bukan dari redirect di browser.
 */
export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as MidtransNotification;
    const outcome = await handleMidtransWebhook(payload);
    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
    return handleApiError(err);
  }
}
