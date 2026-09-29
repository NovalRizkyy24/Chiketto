import { redirect } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function DashboardIndex() {
  const user = await requireUserPage("/dashboard");
  const orgs = user.isPlatformAdmin
    ? await db.organization.findMany({ orderBy: { name: "asc" } })
    : (await db.membership.findMany({ where: { userId: user.id, role: "ORGANIZER" }, include: { org: true } })).map(
        (m) => m.org,
      );
  if (orgs.length === 1 && !user.isPlatformAdmin) redirect(`/dashboard/${orgs[0].slug}`);

  return (
    <div className="page pt-6 pb-16">
      <Wordmark />
      <h1 className="mt-16 text-3xl">Pilih organisasi</h1>
      {orgs.length === 0 ? (
        <p className="mt-4 max-w-[36em] text-ink-2">
          Akun kamu belum menjadi penyelenggara di organisasi mana pun.{" "}
          <Link href="/untuk-penyelenggara" className="btn-text">
            Cara mendaftarkan organisasi
          </Link>
        </p>
      ) : (
        <ul className="mt-8 max-w-160 border-t border-rule">
          {user.isPlatformAdmin ? (
            <li className="border-b border-rule">
              <Link href="/admin" className="flex min-h-14 items-center hover:bg-paper-2">
                Admin platform
              </Link>
            </li>
          ) : null}
          {orgs.map((o) => (
            <li key={o.id} className="border-b border-rule">
              <Link href={`/dashboard/${o.slug}`} className="flex min-h-14 items-center hover:bg-paper-2">
                {o.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
