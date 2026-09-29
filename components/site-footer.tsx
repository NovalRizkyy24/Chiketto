import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="page mt-24 pb-12">
      <div className="border-t border-rule pt-8">
        <p className="font-display text-xl">Satu tiket, satu pintu masuk.</p>
        <p className="mt-3 text-sm text-ink-3">
          <Link href="/tentang" className="hover:underline underline-offset-4">
            Tentang
          </Link>
          {" · "}
          <Link href="/bantuan" className="hover:underline underline-offset-4">
            Bantuan
          </Link>
          {" · "}
          <Link href="/untuk-penyelenggara" className="hover:underline underline-offset-4">
            Untuk Penyelenggara
          </Link>
        </p>
      </div>
    </footer>
  );
}
