import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex flex-col leading-none" aria-label="Chiketto, beranda">
      <span className="font-display text-xl font-bold text-ink">Chiketto</span>
      <span
        lang="ja"
        aria-hidden="true"
        className="mt-1 text-xs text-ink-3"
        style={{ fontFamily: '"Zen Kaku Gothic New", var(--font-body)' }}
      >
        チケット
      </span>
    </Link>
  );
}
