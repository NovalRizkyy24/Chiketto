import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { TicketIcon } from "./icons";
import { Wordmark } from "./wordmark";

export async function SiteNav() {
  const session = await auth();
  const userId = session?.user?.id;
  const [memberships, crewCount] = userId
    ? await Promise.all([
        db.membership.findMany({ where: { userId, role: "ORGANIZER" }, include: { org: true }, take: 1 }),
        db.eventCrew.count({ where: { userId } }),
      ])
    : [[], 0];

  const link = "text-sm text-ink hover:underline underline-offset-4 min-h-11 inline-flex items-center";

  return (
    <header className="page flex items-start justify-between gap-4 pt-6 pb-16 md:pb-24">
      <Wordmark />
      <nav aria-label="Utama" className="flex items-center gap-5 md:gap-8">
        {memberships[0] ? (
          <Link href={`/dashboard/${memberships[0].org.slug}`} className={link}>
            Dashboard
          </Link>
        ) : null}
        {crewCount > 0 ? (
          <Link href="/scan" className={link}>
            Scan
          </Link>
        ) : null}
        <Link href="/tiket-saya" className={link} aria-label="Tiket Saya">
          <TicketIcon className="sm:hidden" />
          <span className="hidden sm:inline">Tiket Saya</span>
        </Link>
        {userId ? (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className={link}>
              Keluar
            </button>
          </form>
        ) : (
          <Link href="/masuk" className={link}>
            Masuk
          </Link>
        )}
      </nav>
    </header>
  );
}
