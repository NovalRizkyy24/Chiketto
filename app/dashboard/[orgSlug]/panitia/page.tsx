import { db } from "@/lib/db";
import { orgForPage } from "../guard";
import { CrewAssignForm, InviteForm, RemoveCrewButton } from "./crew-forms";

export default async function CrewPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org } = await orgForPage(orgSlug);
  const [members, events] = await Promise.all([
    db.membership.findMany({
      where: { orgId: org.id },
      include: { user: { include: { crewAssignments: { select: { eventId: true } } } } },
      orderBy: [{ role: "asc" }],
    }),
    db.event.findMany({
      where: { orgId: org.id, status: { in: ["DRAFT", "PUBLISHED"] } },
      select: { id: true, title: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  const crew = members.filter((m) => m.role === "CREW");
  const organizers = members.filter((m) => m.role === "ORGANIZER");

  return (
    <>
      <h1 className="text-2xl">Panitia</h1>
      <p className="mt-2 max-w-[36em] text-sm text-ink-3">
        Panitia hanya bisa membuka scanner untuk event yang ditugaskan. Penyelenggara bisa memindai semua event organisasi.
      </p>

      <section className="mt-10" aria-labelledby="undang">
        <h2 id="undang" className="text-xl">
          Undang panitia
        </h2>
        <InviteForm orgSlug={orgSlug} events={events} />
      </section>

      <section className="mt-12" aria-labelledby="daftar-panitia">
        <h2 id="daftar-panitia" className="text-xl">
          Panitia
        </h2>
        {crew.length === 0 ? (
          <p className="mt-3 text-sm text-ink-3">Belum ada panitia.</p>
        ) : (
          <ul className="mt-4 border-t border-rule">
            {crew.map((m) => (
              <li key={m.id} className="border-b border-rule py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="break-anywhere">{m.user.name ?? m.user.email}</p>
                    {m.user.name ? <p className="text-sm text-ink-3 break-anywhere">{m.user.email}</p> : null}
                  </div>
                  <RemoveCrewButton orgSlug={orgSlug} userId={m.userId} />
                </div>
                <CrewAssignForm
                  orgSlug={orgSlug}
                  userId={m.userId}
                  events={events}
                  assigned={m.user.crewAssignments.map((a) => a.eventId)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12" aria-labelledby="penyelenggara">
        <h2 id="penyelenggara" className="text-xl">
          Penyelenggara
        </h2>
        <ul className="mt-4 border-t border-rule">
          {organizers.map((m) => (
            <li key={m.id} className="border-b border-rule py-3 break-anywhere">
              {m.user.name ?? m.user.email}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
