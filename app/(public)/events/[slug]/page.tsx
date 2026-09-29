import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { categoryLabel, getPublicEvent } from "@/lib/events";
import { formatDateLong, formatDateShort } from "@/lib/format-date";
import { currentUser } from "@/lib/permissions";
import { countHeldTickets } from "@/lib/orders/create-order";
import { remainingAllowance } from "@/lib/orders/rules";
import { TypePoster } from "@/components/type-poster";
import { TicketPicker, type PickerTicketType } from "./ticket-picker";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getPublicEvent((await params).slug);
  return event ? { title: event.title, description: event.description.slice(0, 160) } : {};
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  const tz = event.org.campus.timezone;
  const user = await currentUser();
  const held = user ? await countHeldTickets(db, user.id, event.id) : 0;
  const now = new Date();

  const types: PickerTicketType[] = event.ticketTypes.map((t) => {
    const remaining = Math.max(0, t.quota - t.sold - t.reserved);
    const state = now < t.salesStart ? "upcoming" : now > t.salesEnd ? "closed" : remaining === 0 ? "soldout" : "open";
    const saleNote =
      state === "upcoming"
        ? `Mulai dijual ${formatDateShort(t.salesStart, tz)}`
        : state === "closed"
          ? "Penjualan ditutup"
          : `Berakhir ${formatDateShort(t.salesEnd, tz)}`;
    return {
      id: t.id,
      name: t.name,
      note: [saleNote, t.studentOnly ? "khusus mahasiswa" : null, t.description].filter(Boolean).join(" · "),
      price: t.price,
      quota: t.quota,
      used: t.quota - remaining,
      remaining,
      studentOnly: t.studentOnly,
      state,
    };
  });

  const closedReason =
    event.status === "CANCELLED"
      ? "Event ini dibatalkan penyelenggara. Pemegang tiket akan dihubungi untuk pengembalian dana."
      : event.status === "ENDED" || event.endsAt < now
        ? "Event ini sudah berakhir."
        : null;

  const rows = [
    ["Waktu", formatDateLong(event.startsAt, tz)],
    ["Tempat", event.venue],
    ["Penyelenggara", event.org.name],
    ["Kategori", categoryLabel(event.category)],
  ];

  return (
    <div className="page">
      <div className="grid gap-10 md:grid-cols-8 md:gap-x-8 xl:grid-cols-12">
        <div className="md:col-span-3 xl:col-span-5">
          {event.posterUrl ? (
            <div className="aspect-4/5 w-full border border-rule bg-paper-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.posterUrl}
                alt={event.posterAlt || `Poster ${event.title}`}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            // Tanpa gambar: lebih pendek di HP supaya judul & tombol beli tidak terdorong jauh ke bawah.
            <div className="w-full border border-rule md:aspect-4/5">
              <TypePoster
                title={event.title}
                org={event.org.name}
                category={categoryLabel(event.category)}
                startsAt={event.startsAt}
                tz={tz}
              />
            </div>
          )}
        </div>

        <div className="md:col-span-5 xl:col-span-6">
          <h1 className="text-3xl break-anywhere">{event.title}</h1>

          <dl className="mt-8 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-y-2 text-base">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="pt-0.5 text-sm text-ink-3">{k}</dt>
                <dd className="break-anywhere">{v}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-16" aria-labelledby="pilih-tiket">
            <h2 id="pilih-tiket" className="text-xl">
              Pilih tiket
            </h2>
            {closedReason ? (
              <p className="mt-4 text-ink-2">{closedReason}</p>
            ) : (
              <TicketPicker
                eventId={event.id}
                types={types}
                maxPerUser={event.maxPerUser}
                allowance={user ? remainingAllowance(held, event.maxPerUser) : event.maxPerUser}
                isLoggedIn={Boolean(user)}
                isStudent={Boolean(user?.studentVerifiedAt)}
                loginHref={`/masuk?callbackUrl=${encodeURIComponent(`/events/${event.slug}`)}`}
                verifyHref={`/verifikasi-mahasiswa?kembali=${encodeURIComponent(`/events/${event.slug}`)}`}
              >
                <section className="mt-16" aria-labelledby="tentang-event">
                  <h2 id="tentang-event" className="text-xl">
                    Tentang event
                  </h2>
                  <p className="prose-event mt-4">{event.description}</p>
                </section>
              </TicketPicker>
            )}
            {closedReason ? <p className="prose-event mt-16">{event.description}</p> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
