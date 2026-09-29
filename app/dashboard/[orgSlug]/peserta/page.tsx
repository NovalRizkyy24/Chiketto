import { db } from "@/lib/db";
import { attendeeQuerySchema, listAttendees } from "@/lib/events";
import { formatTime } from "@/lib/format-date";
import { orgForPage } from "../guard";

const STATUS: Record<string, string> = { ACTIVE: "Belum masuk", CHECKED_IN: "Sudah masuk", VOID: "Dibatalkan" };

type Props = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ event?: string; q?: string; status?: string }>;
};

export default async function AttendeesPage({ params, searchParams }: Props) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const { org, tz } = await orgForPage(orgSlug);
  const events = await db.event.findMany({
    where: { orgId: org.id, status: { not: "DRAFT" } },
    orderBy: { startsAt: "desc" },
    select: { id: true, title: true },
  });
  const eventId = events.find((e) => e.id === sp.event)?.id ?? events[0]?.id;
  const query = attendeeQuerySchema.parse(sp);
  const rows = eventId ? await listAttendees(eventId, query) : [];

  const exportBase = eventId ? `/api/org/${org.id}/events/${eventId}/attendees` : "";
  const exportQs = new URLSearchParams({ ...(query.q ? { q: query.q } : {}), ...(query.status ? { status: query.status } : {}) });

  return (
    <>
      <h1 className="text-2xl">Peserta</h1>
      {events.length === 0 ? (
        <p className="mt-6 text-ink-2">Belum ada event yang terbit.</p>
      ) : (
        <>
          <form className="mt-8 grid gap-4 sm:grid-cols-2 sm:items-end xl:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_auto]">
            <label className="field">
              <span className="label">Event</span>
              <select name="event" defaultValue={eventId} className="input">
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Cari nama, email, atau kode</span>
              <input name="q" defaultValue={query.q} className="input" />
            </label>
            <label className="field">
              <span className="label">Status</span>
              <select name="status" defaultValue={query.status ?? ""} className="input">
                <option value="">Semua</option>
                <option value="ACTIVE">Belum masuk</option>
                <option value="CHECKED_IN">Sudah masuk</option>
                <option value="VOID">Dibatalkan</option>
              </select>
            </label>
            <button type="submit" className="btn btn-secondary sm:justify-self-start">
              Tampilkan
            </button>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-ink-3">
              <span className="font-mono tabular">{rows.length}</span> tiket
            </p>
            <div className="flex gap-6">
              <a href={`${exportBase}?${new URLSearchParams({ ...Object.fromEntries(exportQs), format: "xlsx" })}`} className="btn btn-primary">
                Unduh Excel
              </a>
              <a href={`${exportBase}?${new URLSearchParams({ ...Object.fromEntries(exportQs), format: "csv" })}`} className="btn-text self-center text-sm">
                CSV
              </a>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead className="text-left text-ink-3">
                <tr className="border-b border-rule">
                  <th className="py-2 font-normal">Nama</th>
                  <th className="py-2 font-normal">Jenis</th>
                  <th className="py-2 font-normal">Kode</th>
                  <th className="py-2 font-normal">Pesanan</th>
                  <th className="py-2 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-rule align-top">
                    <td className="py-3 pr-4">
                      <span className="block break-anywhere">{t.holderName}</span>
                      <span className="block text-xs text-ink-3 break-anywhere">{t.owner.email}</span>
                    </td>
                    <td className="py-3 pr-4">{t.ticketType.name}</td>
                    <td className="py-3 pr-4 font-mono">{t.code}</td>
                    <td className="py-3 pr-4 font-mono text-ink-3">{t.order.code}</td>
                    <td className={`py-3 ${t.status === "VOID" ? "text-ink-3" : ""}`}>
                      {STATUS[t.status]}
                      {t.checkedInAt ? <span className="font-mono text-ink-3"> · {formatTime(t.checkedInAt, tz)}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? <p className="mt-4 text-sm text-ink-3">Tidak ada tiket yang cocok.</p> : null}
          </div>
        </>
      )}
    </>
  );
}
