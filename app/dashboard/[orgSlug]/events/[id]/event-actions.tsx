"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { SubmitButton } from "@/components/submit-button";
import { cancelEventAction, publishEventAction } from "../../actions";

type Props = {
  orgSlug: string;
  eventId: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ENDED" | "CANCELLED";
  sold: number;
  canPublish: boolean;
};

export function EventActions({ orgSlug, eventId, slug, status, sold, canPublish }: Props) {
  const [pubState, publish] = useActionState(publishEventAction.bind(null, orgSlug, eventId), {});
  const [cancelState, cancel] = useActionState(cancelEventAction.bind(null, orgSlug, eventId), {});
  const dialog = useRef<HTMLDialogElement>(null);
  const active = status === "DRAFT" || status === "PUBLISHED";

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {status === "DRAFT" ? (
          <form action={publish}>
            <SubmitButton disabled={!canPublish} pendingLabel="Menerbitkan…">
              Terbitkan event
            </SubmitButton>
          </form>
        ) : null}
        {active ? (
          <Link href={`/dashboard/${orgSlug}/events/${eventId}/ubah`} className="btn-text text-sm">
            Ubah detail
          </Link>
        ) : null}
        {status !== "DRAFT" ? (
          <Link href={`/events/${slug}`} className="btn-text text-sm">
            Lihat halaman publik
          </Link>
        ) : null}
        {status === "PUBLISHED" ? (
          <Link href={`/scan/${eventId}`} className="btn-text text-sm">
            Buka scanner
          </Link>
        ) : null}
        <Link href={`/dashboard/${orgSlug}/peserta?event=${eventId}`} className="btn-text text-sm">
          Peserta
        </Link>
        {active ? (
          <button type="button" className="btn-text text-sm" onClick={() => dialog.current?.showModal()}>
            Batalkan event
          </button>
        ) : null}
      </div>
      {!canPublish && status === "DRAFT" ? (
        <p className="mt-2 text-sm text-ink-3">Event bisa diterbitkan setelah organisasi diverifikasi admin.</p>
      ) : null}
      {pubState.error ? (
        <p role="alert" className="field-error mt-2">
          {pubState.error}
        </p>
      ) : null}

      <dialog
        ref={dialog}
        aria-labelledby="batal-title"
        className="m-auto w-[min(92vw,440px)] border border-rule-strong bg-paper p-6 text-ink backdrop:bg-ink/40"
      >
        <h2 id="batal-title" className="text-xl">
          Batalkan event ini?
        </h2>
        <p className="mt-3 text-ink-2">
          {sold > 0
            ? `${sold} tiket yang sudah terjual akan dibatalkan dan pembelinya tidak bisa masuk. Pengembalian dana dilakukan manual oleh penyelenggara. Aksi ini tidak bisa diurungkan.`
            : "Event tidak akan tampil lagi di jadwal. Aksi ini tidak bisa diurungkan."}
        </p>
        {cancelState.error ? (
          <p role="alert" className="field-error mt-3">
            {cancelState.error}
          </p>
        ) : null}
        <form action={cancel} className="mt-6 flex flex-wrap gap-4" onSubmit={() => setTimeout(() => dialog.current?.close(), 0)}>
          <SubmitButton pendingLabel="Membatalkan…">Ya, batalkan event</SubmitButton>
          <button type="button" className="btn btn-secondary" onClick={() => dialog.current?.close()}>
            Jangan batalkan
          </button>
        </form>
      </dialog>
    </div>
  );
}
