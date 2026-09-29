import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "./errors";

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({ where: { id: session.user.id } });
}

/** Untuk route handler: lempar 401 bila belum masuk. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Untuk halaman: arahkan ke /masuk bila belum masuk. */
export async function requireUserPage(callbackUrl: string) {
  const user = await currentUser();
  if (!user) redirect(`/masuk?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}

/** Penyelenggara organisasi (atau admin platform). */
export async function requireOrganizer(userId: string, orgIdOrSlug: { id?: string; slug?: string }) {
  const org = await db.organization.findUnique({
    where: orgIdOrSlug.id ? { id: orgIdOrSlug.id } : { slug: orgIdOrSlug.slug! },
  });
  if (!org) throw new NotFoundError("Organisasi");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user?.isPlatformAdmin) return org;
  const m = await db.membership.findUnique({ where: { userId_orgId: { userId, orgId: org.id } } });
  if (m?.role !== "ORGANIZER") throw new ForbiddenError();
  return org;
}

/** Event milik organisasi yang dikelola user. */
export async function requireOrganizerEvent(userId: string, eventId: string, orgId?: string) {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || (orgId && event.orgId !== orgId)) throw new NotFoundError("Event");
  await requireOrganizer(userId, { id: event.orgId });
  return event;
}

/** Boleh memindai: panitia yang ditugaskan, penyelenggara organisasinya, atau admin platform. */
export async function canScanEvent(userId: string, eventId: string): Promise<boolean> {
  const [user, crew, event] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.eventCrew.findUnique({ where: { eventId_userId: { eventId, userId } } }),
    db.event.findUnique({ where: { id: eventId }, select: { orgId: true } }),
  ]);
  if (!event) return false;
  if (user?.isPlatformAdmin || crew) return true;
  const m = await db.membership.findUnique({ where: { userId_orgId: { userId, orgId: event.orgId } } });
  return m?.role === "ORGANIZER";
}

export async function requirePlatformAdmin(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.isPlatformAdmin) throw new ForbiddenError();
  return user;
}
