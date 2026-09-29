import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SubmitButton } from "@/components/submit-button";
import { Wordmark } from "@/components/wordmark";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { cancelEvent } from "@/lib/events";
import { formatDateLong } from "@/lib/format-date";
import { requirePlatformAdmin, requireUser, requireUserPage } from "@/lib/permissions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

async function verifyOrg(fd: FormData) {
  "use server";
  const user = await requireUser();
  await requirePlatformAdmin(user.id);
  const orgId = String(fd.get("orgId"));
  await db.organization.update({ where: { id: orgId }, data: { verifiedAt: new Date() } });
  await audit("org.verify", orgId, { actorId: user.id });
  revalidatePath("/admin");
}

async function deactivateEvent(fd: FormData) {
  "use server";
  const user = await requireUser();
  await requirePlatformAdmin(user.id);
  await cancelEvent(String(fd.get("eventId")), user.id);
  revalidatePath("/admin");
}

export default async function AdminPage() {
  const user = await requireUserPage("/admin");
  if (!user.isPlatformAdmin) notFound();

  const [orgs, events] = await Promise.all([
    db.organization.findMany({ orderBy: [{ verifiedAt: { sort: "asc", nulls: "first" } }, { name: "asc" }] }),
    db.event.findMany({
      where: { status: "PUBLISHED" },
      include: { org: { include: { campus: true } } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  return (
    <div className="page pt-6 pb-16">
      <Wordmark />
      <h1 className="mt-16 text-3xl">Admin platform</h1>

      <section className="mt-12" aria-labelledby="org">
        <h2 id="org" className="text-xl">
          Organisasi
        </h2>
        <ul className="mt-4 max-w-[720px] border-t border-rule">
          {orgs.map((o) => (
            <li key={o.id} className="flex min-h-[56px] flex-wrap items-center justify-between gap-4 border-b border-rule py-2">
              <span className="break-anywhere">{o.name}</span>
              {o.verifiedAt ? (
                <span className="text-sm text-ink-3">Terverifikasi</span>
              ) : (
                <form action={verifyOrg}>
                  <input type="hidden" name="orgId" value={o.id} />
                  <SubmitButton variant="secondary" pendingLabel="Memverifikasi…">
                    Verifikasi
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="ev">
        <h2 id="ev" className="text-xl">
          Event terbit
        </h2>
        <ul className="mt-4 max-w-[720px] border-t border-rule">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-rule py-3">
              <span className="min-w-0">
                <span className="block break-anywhere">{e.title}</span>
                <span className="block text-sm text-ink-3">
                  {e.org.name} · {formatDateLong(e.startsAt, e.org.campus.timezone)}
                </span>
              </span>
              <form action={deactivateEvent}>
                <input type="hidden" name="eventId" value={e.id} />
                <SubmitButton variant="text" pendingLabel="Menonaktifkan…">
                  Nonaktifkan
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
