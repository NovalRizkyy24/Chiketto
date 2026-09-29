export const DEFAULT_TZ = "Asia/Jakarta";

const TZ_LABEL: Record<string, string> = {
  "Asia/Jakarta": "WIB",
  "Asia/Pontianak": "WIB",
  "Asia/Makassar": "WITA",
  "Asia/Jayapura": "WIT",
};

function partMap(date: Date, tz: string, opts: Intl.DateTimeFormatOptions) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("id-ID", { timeZone: tz, ...opts }).formatToParts(date).map((p) => [p.type, p.value]),
  ) as Partial<Record<Intl.DateTimeFormatPartTypes, string>>;
}

/** `19.00` */
export function formatTime(date: Date, tz = DEFAULT_TZ): string {
  const p = partMap(date, tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${p.hour}.${p.minute}`;
}

/** `Sabtu, 12 Oktober 2026 · 19.00 WIB` */
export function formatDateLong(date: Date, tz = DEFAULT_TZ, withTime = true): string {
  const day = new Intl.DateTimeFormat("id-ID", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  if (!withTime) return day;
  return `${day} · ${formatTime(date, tz)} ${TZ_LABEL[tz] ?? ""}`.trim();
}

/** Untuk papan jadwal: `{ day: "12", sub: "Okt · Sab" }` */
export function formatBoardDate(date: Date, tz = DEFAULT_TZ) {
  const p = partMap(date, tz, { day: "numeric", month: "short", weekday: "short" });
  const clean = (s = "") => s.replace(".", "");
  return { day: p.day ?? "", sub: `${clean(p.month)} · ${clean(p.weekday)}` };
}

/** `Oktober 2026` */
export function formatMonthYear(date: Date, tz = DEFAULT_TZ): string {
  const s = new Intl.DateTimeFormat("id-ID", { timeZone: tz, month: "long", year: "numeric" }).format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** `5 Okt` */
export function formatDateShort(date: Date, tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: tz, day: "numeric", month: "short" })
    .format(date)
    .replace(".", "");
}

/** Kunci tanggal lokal `2026-10-12` untuk pengelompokan. */
export function localDateKey(date: Date, tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
}

/** Nilai untuk <input type="datetime-local"> dalam zona kampus. */
export function toDatetimeLocal(date: Date, tz = DEFAULT_TZ): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, x) => ({ ...acc, [x.type]: x.value }), {});
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Kebalikan `toDatetimeLocal`: `2026-10-12T19:00` di zona kampus → Date (UTC). */
export function fromDatetimeLocal(value: string, tz = DEFAULT_TZ): Date {
  const asUtc = new Date(`${value}:00Z`);
  if (Number.isNaN(asUtc.getTime())) throw new Error("Format tanggal tidak valid.");
  const shown = new Date(`${toDatetimeLocal(asUtc, tz)}:00Z`);
  return new Date(asUtc.getTime() - (shown.getTime() - asUtc.getTime()));
}
