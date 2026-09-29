"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { actionError } from "@/lib/api";
import { inviteCrew, removeCrew, setCrewEvents } from "@/lib/crew";
import { db } from "@/lib/db";
import {
  cancelEvent,
  createEvent,
  deleteTicketType,
  publishEvent,
  restoreTicketType,
  saveTicketType,
  updateEvent,
} from "@/lib/events";
import { requireOrganizer, requireOrganizerEvent, requireUser } from "@/lib/permissions";
import { uploadPoster } from "@/lib/upload";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  savedAt?: number;
  /** Nilai yang dikirim, agar form tidak kosong lagi saat validasi gagal. */
  values?: Record<string, string>;
};

function toState(err: unknown, fd?: FormData): FormState {
  const values = fd
    ? Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string") as [string, string][])
    : undefined;
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const i of err.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Periksa lagi isian yang ditandai.", fieldErrors, values };
  }
  return { error: actionError(err), values };
}

async function organizer(orgSlug: string) {
  const user = await requireUser();
  const org = await requireOrganizer(user.id, { slug: orgSlug });
  return { user, org };
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

async function eventFields(fd: FormData) {
  const poster = fd.get("poster");
  let posterUrl = str(fd, "posterUrl");
  if (poster instanceof File && poster.size > 0) posterUrl = await uploadPoster(poster);
  return {
    title: str(fd, "title"),
    category: str(fd, "category") as "KONSER",
    description: str(fd, "description"),
    venue: str(fd, "venue"),
    startsAt: str(fd, "startsAt"),
    endsAt: str(fd, "endsAt"),
    maxPerUser: str(fd, "maxPerUser"),
    posterUrl,
    posterAlt: str(fd, "posterAlt"),
  };
}

export async function createEventAction(orgSlug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  let id: string;
  try {
    const { user, org } = await organizer(orgSlug);
    id = (await createEvent(org.id, user.id, await eventFields(fd))).id;
  } catch (err) {
    return toState(err, fd);
  }
  redirect(`/dashboard/${orgSlug}/events/${id}`);
}

export async function updateEventAction(
  orgSlug: string,
  eventId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  try {
    const { user, org } = await organizer(orgSlug);
    await requireOrganizerEvent(user.id, eventId, org.id);
    await updateEvent(eventId, user.id, await eventFields(fd));
  } catch (err) {
    return toState(err, fd);
  }
  redirect(`/dashboard/${orgSlug}/events/${eventId}`);
}

export async function publishEventAction(orgSlug: string, eventId: string, _prev: FormState): Promise<FormState> {
  try {
    const { user, org } = await organizer(orgSlug);
    await requireOrganizerEvent(user.id, eventId, org.id);
    await publishEvent(eventId, user.id);
  } catch (err) {
    return toState(err);
  }
  revalidatePath(`/dashboard/${orgSlug}`, "layout");
  return { ok: true };
}

export async function cancelEventAction(orgSlug: string, eventId: string, _prev: FormState): Promise<FormState> {
  try {
    const { user, org } = await organizer(orgSlug);
    await requireOrganizerEvent(user.id, eventId, org.id);
    await cancelEvent(eventId, user.id);
  } catch (err) {
    return toState(err);
  }
  revalidatePath(`/dashboard/${orgSlug}`, "layout");
  return { ok: true };
}

export async function saveTicketTypeAction(
  orgSlug: string,
  eventId: string,
  ticketTypeId: string | undefined,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  try {
    const { user, org } = await organizer(orgSlug);
    await requireOrganizerEvent(user.id, eventId, org.id);
    await saveTicketType(
      eventId,
      user.id,
      {
        name: str(fd, "name"),
        description: str(fd, "description"),
        price: str(fd, "price"),
        quota: str(fd, "quota"),
        studentOnly: fd.get("studentOnly") === "on",
        salesStart: str(fd, "salesStart"),
        salesEnd: str(fd, "salesEnd"),
      },
      ticketTypeId,
    );
  } catch (err) {
    return toState(err, fd);
  }
  revalidatePath(`/dashboard/${orgSlug}/events/${eventId}`);
  return { ok: true, savedAt: Date.now() };
}

export async function deleteTicketTypeAction(orgSlug: string, eventId: string, ticketTypeId: string) {
  try {
    const { user, org } = await organizer(orgSlug);
    await requireOrganizerEvent(user.id, eventId, org.id);
    const snapshot = await deleteTicketType(eventId, user.id, ticketTypeId);
    revalidatePath(`/dashboard/${orgSlug}/events/${eventId}`);
    return {
      ok: true as const,
      snapshot: {
        name: snapshot.name,
        description: snapshot.description,
        price: snapshot.price,
        quota: snapshot.quota,
        studentOnly: snapshot.studentOnly,
        salesStart: snapshot.salesStart.toISOString(),
        salesEnd: snapshot.salesEnd.toISOString(),
        sortOrder: snapshot.sortOrder,
      },
    };
  } catch (err) {
    return { ok: false as const, error: actionError(err) };
  }
}

export async function restoreTicketTypeAction(orgSlug: string, eventId: string, snapshot: unknown) {
  try {
    const { user, org } = await organizer(orgSlug);
    await requireOrganizerEvent(user.id, eventId, org.id);
    await restoreTicketType(eventId, user.id, snapshot);
    revalidatePath(`/dashboard/${orgSlug}/events/${eventId}`);
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: actionError(err) };
  }
}

export async function inviteCrewAction(orgSlug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user, org } = await organizer(orgSlug);
    await inviteCrew(org.id, user.id, { email: str(fd, "email"), eventIds: fd.getAll("eventIds").map(String) });
  } catch (err) {
    return toState(err, fd);
  }
  revalidatePath(`/dashboard/${orgSlug}/panitia`);
  return { ok: true, savedAt: Date.now() };
}

export async function setCrewEventsAction(
  orgSlug: string,
  crewUserId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  try {
    const { user, org } = await organizer(orgSlug);
    await setCrewEvents(org.id, user.id, crewUserId, fd.getAll("eventIds").map(String));
  } catch (err) {
    return toState(err, fd);
  }
  revalidatePath(`/dashboard/${orgSlug}/panitia`);
  return { ok: true, savedAt: Date.now() };
}

export async function removeCrewAction(orgSlug: string, crewUserId: string) {
  const { user, org } = await organizer(orgSlug);
  await removeCrew(org.id, user.id, crewUserId);
  revalidatePath(`/dashboard/${orgSlug}/panitia`);
}

export async function updateOrgAction(orgSlug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const { org } = await organizer(orgSlug);
    const name = str(fd, "name").trim();
    if (name.length < 3) return { fieldErrors: { name: "Nama organisasi minimal 3 karakter." } };
    await db.organization.update({ where: { id: org.id }, data: { name } });
  } catch (err) {
    return toState(err, fd);
  }
  revalidatePath(`/dashboard/${orgSlug}`, "layout");
  return { ok: true, savedAt: Date.now() };
}
