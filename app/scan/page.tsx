import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { formatDateLong } from "@/lib/format-date";
import { requireUserPage } from "@/lib/permissions";
import { scannableEvents } from "@/lib/scan";

export const metadata: Metadata = { title: "Scanner", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ScanIndexPage() {
  const user = await requireUserPage("/scan");
  const events = await scannableEvents(user.id);

  return (
    <div className="page pt-6 pb-16">
      <Wordmark />
      <h1 className="mt-16 text-3xl">Pilih event</h1>
      {events.length === 0 ? (
        <p className="mt-4 max-w-[36em] text-ink-2">
          Kamu belum ditugaskan ke event mana pun. Minta penyelenggara menambahkan email kamu sebagai panitia.
        </p>
      ) : (
        <ul className="mt-8 max-w-160 border-t border-rule">
          {events.map((e) => (
            <li key={e.id} className="border-b border-rule">
              <Link href={`/scan/${e.id}`} className="flex min-h-18 flex-col justify-center py-4 hover:bg-paper-2">
                <span className="text-lg font-medium break-anywhere">{e.title}</span>
                <span className="text-sm text-ink-3">
                  {formatDateLong(e.startsAt, e.org.campus.timezone)} · {e.venue}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
