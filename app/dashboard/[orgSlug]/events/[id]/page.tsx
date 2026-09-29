import Link from "next/link";
import { DailySalesChart } from "@/components/daily-sales-chart";
import { QuotaBar } from "@/components/quota-bar";
import { eventStats } from "@/lib/events";
import { formatDateLong, toDatetimeLocal } from "@/lib/format-date";
import { formatRupiah, formatRupiahPlain } from "@/lib/format-rupiah";
import { eventForPage } from "../../guard";
import { EventActions } from "./event-actions";
import { TicketTypeManager } from "./ticket-types";

const STATUS: Record<string, string> = { DRAFT: "Draft", PUBLISHED: "Terbit", ENDED: "Selesai", CANCELLED: "Dibatalkan" };

export default async function EventDashboardPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const { event, tz, org } = await eventForPage(orgSlug, id);
  const stats = await eventStats(event.id);
  const started = event.startsAt <= new Date();

  return (
    <>
      <p className="text-sm text-ink-3">
        <Link href={`/dashboard/${orgSlug}/events`} className="hover:underline underline-offset-4">
          Event
        </Link>{" "}
        · {STATUS[event.status]}
      </p>
      <h1 className="mt-2 text-2xl break-anywhere">{event.title}</h1>
      <p className="mt-2 text-sm text-ink-2">
        {formatDateLong(event.startsAt, tz)} · {event.venue}
      </p>

      <EventActions
        orgSlug={orgSlug}
        eventId={event.id}
        slug={event.slug}
        status={event.status}
        sold={stats.sold}
        canPublish={Boolean(org.verifiedAt)}
      />

      {/* Ringkasan: satu baris angka besar dengan pemisah garis vertikal, tanpa kartu. */}
      <dl className="mt-12 grid grid-cols-1 border-y border-rule sm:grid-cols-3 sm:divide-x sm:divide-rule">
        {[
          ["Terjual", `${stats.sold} / ${stats.quota}`],
          ["Pendapatan kotor", formatRupiahPlain(stats.grossRevenue)],
          ["Hadir", started || stats.checkedIn > 0 ? String(stats.checkedIn) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="py-4 sm:px-6 sm:first:pl-0">
            <dt className="text-sm text-ink-3">{k}</dt>
            <dd className="mt-1 font-mono text-2xl tabular">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-12" aria-labelledby="per-jenis">
        <h2 id="per-jenis" className="text-xl">
          Per jenis tiket
        </h2>
        {stats.ticketTypes.length === 0 ? (
          <p className="mt-3 text-sm text-ink-3">Belum ada jenis tiket.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-ink-3">
                <tr className="border-b border-rule">
                  <th className="py-2 font-normal">Jenis</th>
                  <th className="py-2 text-right font-normal">Harga</th>
                  <th className="py-2 text-right font-normal">Terjual</th>
                  <th className="py-2 text-right font-normal">Ditahan</th>
                  <th className="w-1/3 py-2 pl-6 font-normal">Kuota</th>
                </tr>
              </thead>
              <tbody>
                {stats.ticketTypes.map((t) => (
                  <tr key={t.id} className="border-b border-rule">
                    <td className="py-3">{t.name}</td>
                    <td className="py-3 text-right font-mono tabular">{formatRupiah(t.price)}</td>
                    <td className="py-3 text-right font-mono tabular">{t.sold}</td>
                    <td className="py-3 text-right font-mono tabular">{t.reserved}</td>
                    <td className="py-3 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <QuotaBar used={t.sold + t.reserved} quota={t.quota} label={`Kuota ${t.name} terpakai`} />
                        </div>
                        <span className="font-mono text-xs tabular text-ink-3">{t.quota}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-12" aria-labelledby="harian">
        <h2 id="harian" className="text-xl">
          Penjualan harian
        </h2>
        <div className="mt-6 max-w-[640px]">
          <DailySalesChart data={stats.dailySales} />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="kelola-tiket">
        <h2 id="kelola-tiket" className="text-xl">
          Kelola jenis tiket
        </h2>
        <TicketTypeManager
          orgSlug={orgSlug}
          eventId={event.id}
          disabled={event.status === "CANCELLED" || event.status === "ENDED"}
          defaults={{
            salesStart: toDatetimeLocal(new Date(), tz),
            salesEnd: toDatetimeLocal(event.startsAt, tz),
          }}
          types={stats.event.ticketTypes.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description ?? "",
            price: t.price,
            quota: t.quota,
            sold: t.sold,
            reserved: t.reserved,
            studentOnly: t.studentOnly,
            salesStart: toDatetimeLocal(t.salesStart, tz),
            salesEnd: toDatetimeLocal(t.salesEnd, tz),
          }))}
        />
      </section>
    </>
  );
}
