import Link from "next/link";

const LINKS = [
  { href: "/tentang", label: "Tentang" },
  { href: "/bantuan", label: "Bantuan" },
  { href: "/untuk-penyelenggara", label: "Untuk Penyelenggara" },
];

export function SiteFooter() {
  return (
    <footer className="page mt-24 pb-[max(48px,env(safe-area-inset-bottom))]">
      <div className="border-t border-rule pt-8">
        <p className="font-display text-xl">Satu tiket, satu pintu masuk.</p>
        {/* Target sentuh ≥ 44px; jarak, bukan titik pemisah, agar tidak menggantung saat patah baris. */}
        <nav aria-label="Tautan kaki" className="mt-2 flex flex-wrap gap-x-6 text-sm text-ink-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex min-h-11 items-center whitespace-nowrap underline-offset-4 hover:text-ink hover:underline"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
