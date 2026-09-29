import Link from "next/link";
import { CATEGORIES, availabilityOf, categoryLabel, listPublicEvents, listQuerySchema } from "@/lib/events";
import { formatBoardDate, formatDateLong, formatMonthYear, formatTime } from "@/lib/format-date";
import { formatRupiah } from "@/lib/format-rupiah";
import { PosterThumb } from "@/components/poster-thumb";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function HomePage({ searchParams }: Props) {
  const params = listQuerySchema.parse(await searchParams);
  const { events, total, page, pageSize } = await listPublicEvents(params);

  const groups = new Map<string, typeof events>();
  for (const e of events) {
    const key = formatMonthYear(e.startsAt, e.org.campus.timezone);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  const href = (next: { kategori?: string; q?: string; page?: number }) => {
    const sp = new URLSearchParams();
    const merged = { kategori: params.kategori, q: params.q, ...next };
    if (merged.kategori) sp.set("kategori", merged.kategori);
    if (merged.q) sp.set("q", merged.q);
    if (merged.page && merged.page > 1) sp.set("page", String(merged.page));
    const s = sp.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div className="page">
      <h1 className="sr-only">Jadwal event kampus</h1>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        {/* Jarak, bukan titik pemisah: saat baris patah di HP tidak ada "·" yang menggantung. */}
        <nav aria-label="Kategori" className="flex flex-wrap items-center gap-x-5 text-sm">
          {[{ value: undefined, label: "Semua" }, ...CATEGORIES].map((c) => {
            const active = params.kategori === c.value;
            return (
              <Link
                key={c.label}
                href={href({ kategori: c.value, page: 1 })}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap border-b-2 ${
                  active ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink"
                }`}
              >
                {c.label}
              </Link>
            );
          })}
        </nav>
        <form role="search" action="/" className="w-full md:w-72">
          {params.kategori ? <input type="hidden" name="kategori" value={params.kategori} /> : null}
          <label className="field w-full">
            <span className="label">Cari</span>
            <input
              name="q"
              type="search"
              defaultValue={params.q}
              placeholder="Judul, tempat, atau penyelenggara"
              className="input"
            />
          </label>
        </form>
      </div>

      {events.length === 0 ? (
        <p className="mt-16 max-w-[36em] text-ink-2">
          {params.q || params.kategori
            ? "Belum ada event yang cocok. Coba kategori lain atau kata kunci yang lebih umum."
            : "Belum ada event yang dijadwalkan. Cek lagi nanti."}
        </p>
      ) : null}

      {[...groups].map(([month, list]) => (
        <section key={month} className="mt-16" aria-labelledby={`bulan-${month}`}>
          <h2 id={`bulan-${month}`} className="text-xl">
            {month}
          </h2>
          <ol className="mt-4 border-t border-rule">
            {list.map((e) => {
              const tz = e.org.campus.timezone;
              const d = formatBoardDate(e.startsAt, tz);
              const a = availabilityOf(e.ticketTypes);
              const prices = e.ticketTypes.map((t) => t.price);
              const min = prices.length ? Math.min(...prices) : 0;
              const priceLabel =
                new Set(prices).size > 1 && min > 0 ? `Mulai ${formatRupiah(min)}` : formatRupiah(min);
              const soldOut = a.status === "habis";
              return (
                <li key={e.id} className="border-b border-rule">
                  {/* HP & tablet: poster · (tanggal, judul, info, harga). Mulai 1024px: tanggal · poster · judul & info · harga. */}
                  <Link
                    href={`/events/${e.slug}`}
                    className="group grid grid-cols-[104px_minmax(0,1fr)] gap-x-4 py-6 transition-colors duration-(--dur-fast) hover:bg-paper-2 min-[360px]:grid-cols-[112px_minmax(0,1fr)] sm:grid-cols-[136px_minmax(0,1fr)] sm:gap-x-6 md:grid-cols-[152px_minmax(0,1fr)] lg:grid-cols-[96px_152px_minmax(0,1fr)_auto] lg:gap-x-8 lg:py-8 xl:grid-cols-[112px_168px_minmax(0,1fr)_auto]"
                  >
                    <span className="hidden flex-col lg:col-start-1 lg:row-start-1 lg:flex" aria-hidden="true">
                      <span className="font-display text-date leading-none tabular">{d.day}</span>
                      <span className="mt-2 text-xs text-ink-3">{d.sub}</span>
                    </span>

                    <PosterThumb
                      src={e.posterUrl}
                      className={`col-start-1 row-start-1 self-start lg:col-start-2 ${soldOut ? "opacity-60" : ""}`}
                    />

                    <span className="col-start-2 row-start-1 flex min-w-0 flex-col lg:col-start-3 lg:pt-2">
                      <span className="sr-only">{formatDateLong(e.startsAt, tz)}. </span>
                      <span className="mb-3 flex items-baseline gap-2 lg:hidden" aria-hidden="true">
                        <span className="font-display text-[2.5rem] leading-none tabular">{d.day}</span>
                        <span className="text-xs text-ink-3">{d.sub}</span>
                      </span>
                      <span
                        className={`text-lg font-medium leading-snug break-anywhere lg:text-xl ${soldOut ? "text-ink-3" : "group-hover:underline group-hover:underline-offset-4"}`}
                      >
                        {e.title}
                      </span>
                      <span className="mt-1 text-sm text-ink-3 break-anywhere">
                        {e.org.name} · {e.venue}
                      </span>
                      <span className="mt-1 hidden text-sm text-ink-3 sm:block">
                        {categoryLabel(e.category)} · pukul <span className="font-mono tabular">{formatTime(e.startsAt, tz)}</span>
                      </span>
                      <span className="mt-3 flex flex-wrap items-baseline gap-x-3 lg:hidden">
                        <span className="whitespace-nowrap font-mono text-base tabular">{priceLabel}</span>
                        {a.status === "sisa-sedikit" ? (
                          <span className="text-sm font-medium text-ink">Sisa sedikit</span>
                        ) : soldOut ? (
                          <span className="text-sm text-ink-3">Habis</span>
                        ) : null}
                      </span>
                    </span>

                    <span className="hidden lg:col-start-4 lg:row-start-1 lg:flex lg:flex-col lg:items-end lg:pt-2">
                      <span className="whitespace-nowrap font-mono text-lg tabular">{priceLabel}</span>
                      {a.status === "sisa-sedikit" ? (
                        <span className="text-sm font-medium text-ink">Sisa sedikit</span>
                      ) : soldOut ? (
                        <span className="text-sm text-ink-3">Habis</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      {total > page * pageSize || page > 1 ? (
        <nav aria-label="Halaman" className="mt-10 flex gap-6 text-sm">
          {page > 1 ? (
            <Link href={href({ page: page - 1 })} className="btn-text">
              Sebelumnya
            </Link>
          ) : null}
          {total > page * pageSize ? (
            <Link href={href({ page: page + 1 })} className="btn-text">
              Berikutnya
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
