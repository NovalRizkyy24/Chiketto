import { z } from "zod";
import { db } from "./db";
import { audit } from "./audit";
import { AppError } from "./errors";
import { appUrl, sendMail } from "./email";

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  eventIds: z.array(z.string()).default([]),
});

/**
 * Undang panitia: akun dibuat bila belum ada (login lewat magic link ke email yang sama),
 * lalu diberi peran CREW di organisasi dan ditugaskan ke event yang dipilih.
 */
export async function inviteCrew(orgId: string, actorId: string, input: unknown) {
  const { email, eventIds } = inviteSchema.parse(input);
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  const events = await db.event.findMany({ where: { id: { in: eventIds }, orgId }, select: { id: true, title: true } });
  if (events.length !== eventIds.length) throw new AppError("Ada event yang bukan milik organisasi ini.");

  const user = await db.user.upsert({ where: { email }, create: { email }, update: {} });
  const existing = await db.membership.findUnique({ where: { userId_orgId: { userId: user.id, orgId } } });
  if (!existing) await db.membership.create({ data: { userId: user.id, orgId, role: "CREW" } });
  for (const e of events) {
    await db.eventCrew.upsert({
      where: { eventId_userId: { eventId: e.id, userId: user.id } },
      create: { eventId: e.id, userId: user.id },
      update: {},
    });
  }
  await audit("crew.invite", user.id, { actorId, meta: { orgId, eventIds } });

  const list = events.map((e) => `• ${e.title}`).join("\n");
  await sendMail({
    to: email,
    subject: `Kamu diundang jadi panitia ${org.name}`,
    text: `${org.name} mengundang kamu menjadi panitia di Chiketto.\n${list}\n\nMasuk dengan email ini lalu buka ${appUrl("/scan")} untuk memindai tiket.`,
    html: `<p style="font-family:sans-serif;font-size:16px;line-height:1.7">${org.name} mengundang kamu menjadi panitia di Chiketto.</p>
<p style="font-family:sans-serif;font-size:16px;line-height:1.7">${events.map((e) => e.title).join("<br>")}</p>
<p><a href="${appUrl("/masuk?callbackUrl=/scan")}" style="display:inline-block;background:#1c1f24;color:#f5f3ee;padding:12px 20px;border-radius:2px;text-decoration:none;font-family:sans-serif;font-weight:700">Buka scanner</a></p>
<p style="font-family:sans-serif;font-size:14px;color:#6b6e73">Masuk memakai alamat email ini.</p>`,
  });
  return user;
}

export async function setCrewEvents(orgId: string, actorId: string, userId: string, eventIds: string[]) {
  const orgEvents = await db.event.findMany({ where: { orgId }, select: { id: true } });
  const allowed = new Set(orgEvents.map((e) => e.id));
  const wanted = eventIds.filter((id) => allowed.has(id));
  await db.$transaction([
    db.eventCrew.deleteMany({ where: { userId, eventId: { in: [...allowed] } } }),
    db.eventCrew.createMany({ data: wanted.map((eventId) => ({ eventId, userId })) }),
  ]);
  await audit("crew.assign", userId, { actorId, meta: { orgId, eventIds: wanted } });
}

export async function removeCrew(orgId: string, actorId: string, userId: string) {
  const m = await db.membership.findUnique({ where: { userId_orgId: { userId, orgId } } });
  if (!m || m.role !== "CREW") throw new AppError("Hanya panitia yang bisa dihapus dari sini.");
  const orgEvents = await db.event.findMany({ where: { orgId }, select: { id: true } });
  await db.$transaction([
    db.eventCrew.deleteMany({ where: { userId, eventId: { in: orgEvents.map((e) => e.id) } } }),
    db.membership.delete({ where: { id: m.id } }),
  ]);
  await audit("crew.remove", userId, { actorId, meta: { orgId } });
}
