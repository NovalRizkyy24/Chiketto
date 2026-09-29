import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { requireOrganizer, requireOrganizerEvent, requireUserPage } from "@/lib/permissions";

/** Setiap halaman dashboard memeriksa peran sendiri (layout dirender paralel, bukan gerbang). */
export async function orgForPage(orgSlug: string) {
  const user = await requireUserPage(`/dashboard/${orgSlug}`);
  try {
    const org = await requireOrganizer(user.id, { slug: orgSlug });
    const campus = await db.campus.findUniqueOrThrow({ where: { id: org.campusId } });
    return { user, org, tz: campus.timezone };
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
}

export async function eventForPage(orgSlug: string, eventId: string) {
  const ctx = await orgForPage(orgSlug);
  try {
    const event = await requireOrganizerEvent(ctx.user.id, eventId, ctx.org.id);
    return { ...ctx, event };
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
}
