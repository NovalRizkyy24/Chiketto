import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateLong } from "@/lib/format-date";
import { orgForPage } from "../guard";

const STATUS: Record<string, string> = { DRAFT: "Draft", PUBLISHED: "Terbit", ENDED: "Selesai", CANCELLED: "Dibatalkan" };

export default async function OrgEventsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, tz } = await orgForPage(orgSlug);
  const events = await db.event.findMany({
    where: { orgId: org.id },
    include: { ticketTypes: { select: { sold: true, quota: true } } },
    orderBy: { startsAt: "desc" },
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl">Event</h1>
        <Link href={`/dashboard/${orgSlug}/events/baru`} className="btn btn-primary">
          Buat event
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="mt-8 text-ink-2">Belum ada event. Buat event pertama kamu, lalu tambahkan jenis tiketnya.</p>
      ) : (
        <ul className="mt-8 border-t border-rule">
          {events.map((e) => {
            const sold = e.ticketTypes.reduce((s, t) => s + t.sold, 0);
            const quota = e.ticketTypes.reduce((s, t) => s + t.quota, 0);
            return (
              <li key={e.id} className="border-b border-rule">
                <Link
                  href={`/dashboard/${orgSlug}/events/${e.id}`}
                  className="grid min-h-18 gap-1 py-4 hover:bg-paper-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6"
                >
                  <span className="min-w-0">
                    <span className="block font-medium break-anywhere">{e.title}</span>
                    <span className="block text-sm text-ink-3">
                      {formatDateLong(e.startsAt, tz)} · {STATUS[e.status]}
                    </span>
                  </span>
                  <span className="font-mono text-sm tabular text-ink-2">
                    {sold} / {quota} terjual
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
