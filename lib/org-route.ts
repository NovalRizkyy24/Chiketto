import { requireOrganizer, requireOrganizerEvent, requireUser } from "./permissions";

/** Konteks route handler penyelenggara: user + organisasi yang benar-benar menjadi haknya. */
export async function orgRoute(params: Promise<{ orgId: string; id?: string }>) {
  const p = await params;
  const user = await requireUser();
  const org = await requireOrganizer(user.id, { id: p.orgId });
  const event = p.id ? await requireOrganizerEvent(user.id, p.id, org.id) : null;
  return { user, org, event };
}
