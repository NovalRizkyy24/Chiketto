import { formatDateLong, formatTime } from "@/lib/format-date";
import { formatRupiah } from "@/lib/format-rupiah";

export type ETicketData = {
  id: string;
  code: string;
  holderName: string;
  status: "ACTIVE" | "CHECKED_IN" | "VOID";
  checkedInAt: Date | null;
  svg: string | null;
  event: { title: string; startsAt: Date; venue: string; org: { name: string; campus: { timezone: string } } };
  ticketType: { name: string; price: number };
};

/** Stempel hanko: satu-satunya "momen" visual di aplikasi. */
export function Hanko({ time }: { time: string }) {
  return (
    <div
      className="hanko pointer-events-none flex size-[72px] flex-col items-center justify-center rounded-full border-2 border-accent font-mono font-medium leading-tight text-accent"
      aria-label={`Sudah masuk pukul ${time}`}
      role="img"
    >
      <span className="text-xs tracking-[0.08em]">MASUK</span>
      <span className="text-sm tabular">{time}</span>
    </div>
  );
}

export function ETicket({ t, pdfHref }: { t: ETicketData; pdfHref?: string }) {
  const tz = t.event.org.campus.timezone;
  const isVoid = t.status === "VOID";
  const checkedIn = t.status === "CHECKED_IN";

  return (
    <article
      aria-label={`E-tiket ${t.event.title}, ${t.ticketType.name}`}
      className={`flex flex-col border border-rule-strong md:flex-row ${isVoid ? "text-ink-3" : ""}`}
    >
      <div className={`relative flex-1 p-6 md:p-8 break-anywhere ${checkedIn ? "pr-28 md:pr-32" : ""}`}>
        {isVoid ? <p className="mb-3 text-sm font-bold">Tiket dibatalkan</p> : null}
        <h3 className={`text-xl ${isVoid ? "text-ink-3" : ""}`}>{t.event.title}</h3>
        <p className="mt-5 text-sm">{formatDateLong(t.event.startsAt, tz)}</p>
        <p className="text-sm">{t.event.venue}</p>
        <p className="mt-5 text-sm">
          {t.ticketType.name} · {formatRupiah(t.ticketType.price)}
        </p>
        <p className="text-sm">{t.holderName}</p>

        {checkedIn && t.checkedInAt ? (
          <div className="absolute right-4 top-4 md:right-6 md:top-6">
            <Hanko time={formatTime(t.checkedInAt, tz)} />
          </div>
        ) : null}
      </div>

      <div className="order-first flex flex-col items-center gap-3 border-b border-dashed border-rule-strong p-6 md:order-last md:w-64 md:border-b-0 md:border-l">
        {t.svg && !isVoid ? (
          <div
            className={`w-[216px] bg-[var(--color-qr-surface)] p-2 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full ${checkedIn ? "opacity-60" : ""}`}
            role="img"
            aria-label={`Kode QR tiket ${t.code}`}
            dangerouslySetInnerHTML={{ __html: t.svg }}
          />
        ) : null}
        <p className="font-mono text-lg tracking-[0.08em]" aria-label={`Kode tiket ${t.code.split("").join(" ")}`}>
          {t.code}
        </p>
        {!isVoid && !checkedIn ? (
          <p className="text-center text-xs text-ink-3">Naikkan kecerahan layar saat dipindai.</p>
        ) : null}
        {pdfHref && !isVoid ? (
          <a href={pdfHref} className="btn-text text-sm">
            Unduh e-tiket
          </a>
        ) : null}
      </div>
    </article>
  );
}
