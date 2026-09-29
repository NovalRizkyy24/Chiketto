import { db } from "./db";

/** Event yang boleh dipindai user: ditugaskan sebagai panitia, atau milik organisasi yang ia kelola. */
export async function scannableEvents(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  return db.event.findMany({
    where: {
      status: "PUBLISHED",
      endsAt: { gte: since },
      ...(user?.isPlatformAdmin
        ? {}
        : {
            OR: [
              { crew: { some: { userId } } },
              { org: { members: { some: { userId, role: "ORGANIZER" } } } },
            ],
          }),
    },
    include: { org: { include: { campus: true } } },
    orderBy: { startsAt: "asc" },
  });
}
