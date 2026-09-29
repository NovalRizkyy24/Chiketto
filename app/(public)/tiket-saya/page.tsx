import type { Metadata } from "next";
import Link from "next/link";
import { ETicket } from "@/components/e-ticket";
import { db } from "@/lib/db";
import { formatDateLong, formatTime } from "@/lib/format-date";
import { requireUserPage } from "@/lib/permissions";
import { myTickets } from "@/lib/tickets";
import { OfflineReady } from "./offline-ready";

export const metadata: Metadata = { title: "Tiket Saya", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MyTicketsPage() {
  const user = await requireUserPage("/tiket-saya");
  const [{ active, history }, pending] = await Promise.all([
    myTickets(user.id),
    db.order.findMany({
      where: { userId: user.id, status: "PENDING", expiresAt: { gt: new Date() } },
      include: { event: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="page">
      <h1 className="text-3xl">Tiket Saya</h1>
      <OfflineReady />

      {pending.length > 0 ? (
        <section className="mt-10" aria-labelledby="menunggu">
          <h2 id="menunggu" className="text-xl">
            Menunggu pembayaran
          </h2>
          <ul className="mt-4 border-t border-rule">
            {pending.map((o) => (
              <li key={o.id} className="border-b border-rule">
                <Link href={`/checkout/${o.code}`} className="flex min-h-[56px] items-center justify-between gap-4 py-3 hover:bg-paper-2">
                  <span className="break-anywhere">{o.event.title}</span>
                  <span className="shrink-0 whitespace-nowrap font-mono text-sm text-ink-3">{o.code}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-16" aria-labelledby="aktif">
        <h2 id="aktif" className="text-xl">
          Aktif
        </h2>
        {active.length === 0 ? (
          <p className="mt-4 text-ink-2">
            Belum ada tiket aktif.{" "}
            <Link href="/" className="btn-text">
              Lihat jadwal event
            </Link>
          </p>
        ) : (
          <div className="mt-6 flex max-w-[760px] flex-col gap-10">
            {active.map((t) => (
              <ETicket key={t.id} t={t} pdfHref={`/api/tickets/${t.code}/pdf`} />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 ? (
        <section className="mt-16" aria-labelledby="riwayat">
          <h2 id="riwayat" className="text-xl">
            Riwayat
          </h2>
          {/* Riwayat ringkas: QR event yang sudah lewat tidak berguna, jadi tidak ditampilkan. */}
          <ul className="mt-4 max-w-[760px] border-t border-rule">
            {history.map((t) => {
              const tz = t.event.org.campus.timezone;
              const status =
                t.status === "CHECKED_IN" && t.checkedInAt
                  ? `Masuk pukul ${formatTime(t.checkedInAt, tz)}`
                  : t.status === "VOID" || t.event.status === "CANCELLED"
                    ? "Dibatalkan"
                    : "Tidak dipakai";
              return (
                <li
                  key={t.id}
                  className="grid gap-x-6 gap-y-1 border-b border-rule py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline"
                >
                  <div className="min-w-0">
                    <p className="font-medium break-anywhere">{t.event.title}</p>
                    <p className="text-sm text-ink-3">
                      {formatDateLong(t.event.startsAt, tz, false)} · {t.ticketType.name}
                    </p>
                  </div>
                  <p className="text-sm text-ink-2 sm:text-right">
                    {status} <span className="font-mono text-ink-3">· {t.code}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!user.studentVerifiedAt ? (
        <p className="mt-16 text-sm text-ink-3">
          Mahasiswa bisa membuka harga khusus.{" "}
          <Link href="/verifikasi-mahasiswa" className="btn-text">
            Verifikasi email kampus
          </Link>
        </p>
      ) : null}
    </div>
  );
}
