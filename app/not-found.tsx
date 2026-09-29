import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export default function NotFound() {
  return (
    <div className="page pt-6">
      <Wordmark />
      <div className="mt-24 max-w-[36em]">
        <h1 className="text-3xl">Halaman tidak ditemukan</h1>
        <p className="mt-4 text-ink-2">Tautannya mungkin salah ketik, atau event-nya sudah tidak tersedia.</p>
        <Link href="/" className="btn btn-secondary mt-8">
          Lihat jadwal event
        </Link>
      </div>
    </div>
  );
}
