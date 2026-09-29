/**
 * Poster kecil (4:5) untuk baris papan jadwal. Tanpa poster → gambar default bermotif
 * tiket (takik + garis sobekan), memakai token warna agar ikut mode gelap.
 */
export function PosterThumb({ src, className = "" }: { src: string | null; className?: string }) {
  return (
    <span className={`block aspect-4/5 w-full overflow-hidden border border-rule bg-paper-2 ${className}`}>
      {src ? (
        // Dekoratif: judul event sudah tertulis di baris yang sama.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <PosterFallback />
      )}
    </span>
  );
}

export function PosterFallback() {
  return (
    <svg viewBox="0 0 80 100" className="block h-full w-full" aria-hidden="true" preserveAspectRatio="none">
      <rect width="80" height="100" fill="var(--color-paper-2)" />
      {/* garis jadwal */}
      <path d="M14 26H52M14 34H44M14 42H48" stroke="var(--color-rule)" strokeWidth="2" />
      {/* takik tiket + garis sobekan */}
      <circle cx="0" cy="68" r="6" fill="var(--color-paper)" />
      <circle cx="80" cy="68" r="6" fill="var(--color-paper)" />
      <path d="M10 68H70" stroke="var(--color-ink-3)" strokeWidth="1" strokeDasharray="3 3" />
      <path d="M14 82H34" stroke="var(--color-ink-3)" strokeWidth="2" />
    </svg>
  );
}
