import { formatBoardDate, formatTime } from "@/lib/format-date";

/**
 * Poster tipografis untuk event tanpa gambar: memakai bahasa papan jadwal
 * (tanggal besar Mincho) supaya area poster tidak terasa kosong.
 */
export function TypePoster({
  title,
  org,
  category,
  startsAt,
  tz,
}: {
  title: string;
  org: string;
  category: string;
  startsAt: Date;
  tz: string;
}) {
  const d = formatBoardDate(startsAt, tz);
  return (
    <div
      role="img"
      aria-label={`Poster ${title}`}
      className="flex h-full flex-col justify-between gap-6 bg-paper-2 p-6 md:p-8"
    >
      <p className="text-xs text-ink-3" aria-hidden="true">
        {category}
      </p>
      <div aria-hidden="true">
        <p className="font-display text-[clamp(4rem,16vw,9rem)] leading-none tabular">{d.day}</p>
        <p className="mt-3 text-sm text-ink-2">
          {d.sub} · <span className="font-mono tabular">{formatTime(startsAt, tz)}</span>
        </p>
      </div>
      <div className="hidden border-t border-rule-strong pt-4 md:block" aria-hidden="true">
        <p className="font-display text-xl break-anywhere">{title}</p>
        <p className="mt-1 text-sm text-ink-3 break-anywhere">{org}</p>
      </div>
    </div>
  );
}
