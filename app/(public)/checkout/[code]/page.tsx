import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateLong } from "@/lib/format-date";
import { midtransEnabled, paymentMockEnabled, snapScriptUrl } from "@/lib/midtrans";
import { requireUserPage } from "@/lib/permissions";
import { CheckoutView } from "./checkout-view";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUserPage(`/checkout/${code}`);
  const order = await db.order.findUnique({
    where: { code },
    include: {
      items: { include: { ticketType: true } },
      event: { include: { org: { include: { campus: true } } } },
    },
  });
  if (!order || order.userId !== user.id) notFound();

  return (
    <div className="page">
      <div className="max-w-120">
        <CheckoutView
          order={{
            code: order.code,
            status: order.status,
            total: order.total,
            expiresAt: order.expiresAt.toISOString(),
            items: order.items.map((i) => ({ name: i.ticketType.name, qty: i.qty, unitPrice: i.unitPrice })),
          }}
          event={{
            title: order.event.title,
            slug: order.event.slug,
            when: formatDateLong(order.event.startsAt, order.event.org.campus.timezone),
            venue: order.event.venue,
          }}
          payment={{
            midtrans: midtransEnabled(),
            clientKey: process.env.MIDTRANS_CLIENT_KEY ?? "",
            snapUrl: snapScriptUrl(),
            mock: paymentMockEnabled(),
          }}
        />
      </div>
    </div>
  );
}
