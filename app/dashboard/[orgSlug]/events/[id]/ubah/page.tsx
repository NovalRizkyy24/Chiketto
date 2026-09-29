import { toDatetimeLocal } from "@/lib/format-date";
import { updateEventAction } from "../../../actions";
import { eventForPage } from "../../../guard";
import { EventForm } from "../../event-form";

export default async function EditEventPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const { event, tz } = await eventForPage(orgSlug, id);
  return (
    <>
      <h1 className="text-2xl break-anywhere">Ubah {event.title}</h1>
      <div className="mt-8">
        <EventForm
          action={updateEventAction.bind(null, orgSlug, event.id)}
          submitLabel="Simpan perubahan"
          values={{
            title: event.title,
            category: event.category,
            description: event.description,
            venue: event.venue,
            startsAt: toDatetimeLocal(event.startsAt, tz),
            endsAt: toDatetimeLocal(event.endsAt, tz),
            maxPerUser: event.maxPerUser,
            posterUrl: event.posterUrl ?? "",
            posterAlt: event.posterAlt ?? "",
          }}
        />
      </div>
    </>
  );
}
