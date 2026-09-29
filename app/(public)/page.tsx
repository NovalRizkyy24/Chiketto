import Link from "next/link";
import { CATEGORIES, availabilityOf, listPublicEvents, listQuerySchema } from "@/lib/events";
import { formatBoardDate, formatDateLong, formatMonthYear } from "@/lib/format-date";
import { formatRupiah } from "@/lib/format-rupiah";

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
        <nav aria-label="Kategori" className="flex flex-wrap items-center gap-x-1 text-sm">
          {[{ value: undefined, label: "Semua" }, ...CATEGORIES].map((c, i) => {
            const active = params.kategori === c.value;
            return (
              <span key={c.label} className="inline-flex items-center">
                {i > 0 ? <span className="px-1.5 text-ink-3" aria-hidden="true">·</span> : null}
                <Link
                  href={href({ kategori: c.value, page: 1 })}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center border-b-2 ${
                    active ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink"
                  }`}
                >
                  {c.label}
                </Link>
              </span>
            );
          })}
        </nav>
        <form role="search" action="/" className="flex w-full items-end gap-2 md:w-64">
          {params.kategori ? <input type="hidden" name="kategori" value={params.kategori} /> : null}
          <label className="field w-full">
            <span className="sr-only">Cari event</span>
            <input name="q" defaultValue={params.q} placeholder="Cari event, tempat, penyelenggara" className="input" />
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
                  <Link
                    href={`/events/${e.slug}`}
                    className="grid min-h-[72px] grid-cols-[64px_minmax(0,1fr)] gap-x-4 py-5 transition-colors duration-[var(--dur-fast)] hover:bg-paper-2 md:grid-cols-[120px_minmax(0,1fr)_auto] md:gap-x-8"
                  >
                    <span className="row-span-2 flex flex-col md:row-span-1">
                      <span className="font-display text-date leading-none tabular" aria-hidden="true">
                        {d.day}
                      </span>
                      <span className="mt-2 text-xs text-ink-3" aria-hidden="true">
                        {d.sub}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-col justify-center">
                      <span className="sr-only">{formatDateLong(e.startsAt, tz)}. </span>
                      <span className={`text-lg font-medium break-anywhere ${soldOut ? "text-ink-3" : ""}`}>
                        {e.title}
                      </span>
                      <span className="text-sm text-ink-3 break-anywhere">
                        {e.org.name} · {e.venue}
                      </span>
                    </span>
                    <span className="mt-2 flex items-baseline gap-3 md:mt-0 md:flex-col md:items-end md:justify-center md:gap-0">
                      <span className="font-mono text-base tabular">{priceLabel}</span>
                      {a.status === "sisa-sedikit" ? (
                        <span className="text-sm text-accent">Sisa sedikit</span>
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
