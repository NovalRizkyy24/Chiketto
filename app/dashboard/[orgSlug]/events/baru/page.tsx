import { createEventAction } from "../../actions";
import { orgForPage } from "../../guard";
import { EventForm } from "../event-form";

export default async function NewEventPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await orgForPage(orgSlug);
  return (
    <>
      <h1 className="text-2xl">Buat event</h1>
      <p className="mt-2 text-sm text-ink-3">Event disimpan sebagai draft. Tambahkan jenis tiket, lalu terbitkan.</p>
      <div className="mt-8">
        <EventForm action={createEventAction.bind(null, orgSlug)} submitLabel="Simpan draft" />
      </div>
    </>
  );
}
