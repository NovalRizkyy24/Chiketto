import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { checkinCounts } from "@/lib/checkin";
import { db } from "@/lib/db";
import { canScanEvent, requireUserPage } from "@/lib/permissions";
import { Scanner } from "./scanner";

export const metadata: Metadata = { title: "Scanner", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ScanPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await requireUserPage(`/scan/${eventId}`);
  if (!(await canScanEvent(user.id, eventId))) notFound();
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true, title: true } });
  if (!event) notFound();

  return <Scanner eventId={event.id} eventTitle={event.title} initialCounts={await checkinCounts(event.id)} />;
}
