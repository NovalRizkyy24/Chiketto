import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

export async function truncateAll() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

export async function makeEvent(opts: { quota: number; price: number; maxPerUser?: number; studentOnly?: boolean }) {
  const campus = await db.campus.create({ data: { name: "Kampus Tes", emailDomain: `${randomUUID()}.ac.id` } });
  const org = await db.organization.create({
    data: { name: "HIMA Tes", slug: `hima-${randomUUID()}`, campusId: campus.id, verifiedAt: new Date() },
  });
  const now = Date.now();
  const event = await db.event.create({
    data: {
      orgId: org.id,
      slug: `event-${randomUUID()}`,
      title: "Malam Akustik Tes",
      category: "KONSER",
      description: "Event untuk pengujian integrasi.",
      venue: "Aula",
      startsAt: new Date(now + 7 * 86_400_000),
      endsAt: new Date(now + 7 * 86_400_000 + 3 * 3_600_000),
      status: "PUBLISHED",
      maxPerUser: opts.maxPerUser ?? 4,
      ticketTypes: {
        create: {
          name: "Presale",
          price: opts.price,
          quota: opts.quota,
          studentOnly: opts.studentOnly ?? false,
          salesStart: new Date(now - 86_400_000),
          salesEnd: new Date(now + 6 * 86_400_000),
        },
      },
    },
    include: { ticketTypes: true },
  });
  return { campus, org, event, ticketType: event.ticketTypes[0] };
}

export async function makeUsers(n: number) {
  return Promise.all(
    Array.from({ length: n }, (_, i) => db.user.create({ data: { name: `Pembeli ${i + 1}`, email: `u${i}-${randomUUID()}@tes.id` } })),
  );
}
