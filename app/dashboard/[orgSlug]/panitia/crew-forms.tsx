"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { inviteCrewAction, removeCrewAction, setCrewEventsAction, type FormState } from "../actions";

type Ev = { id: string; title: string };

function EventChecks({ events, checked }: { events: Ev[]; checked?: string[] }) {
  if (events.length === 0) return <p className="text-sm text-ink-3">Belum ada event aktif.</p>;
  return (
    <fieldset className="flex flex-col">
      <legend className="label mb-1">Event yang boleh dipindai</legend>
      {events.map((e) => (
        <label key={e.id} className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            name="eventIds"
            value={e.id}
            defaultChecked={checked?.includes(e.id)}
            className="size-5 accent-ink"
          />
          <span className="break-anywhere">{e.title}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function InviteForm({ orgSlug, events }: { orgSlug: string; events: Ev[] }) {
  const [state, action] = useActionState<FormState, FormData>(inviteCrewAction.bind(null, orgSlug), {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state.savedAt, state.ok]);

  return (
    <form ref={form} action={action} className="mt-4 flex max-w-120 flex-col gap-4">
      <label className="field">
        <span className="label">Email panitia</span>
        <input
          name="email"
          type="email"
          required
          defaultValue={state.ok ? "" : state.values?.email}
          className="input"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email ? <span className="field-error">{state.fieldErrors.email}</span> : null}
      </label>
      <EventChecks events={events} />
      <div className="flex items-center gap-4">
        <SubmitButton pendingLabel="Mengirim…">Kirim undangan</SubmitButton>
        {state.ok ? (
          <p role="status" className="text-sm text-ink-2">
            Undangan terkirim.
          </p>
        ) : null}
      </div>
      {state.error && !state.fieldErrors ? (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function CrewAssignForm({
  orgSlug,
  userId,
  events,
  assigned,
}: {
  orgSlug: string;
  userId: string;
  events: Ev[];
  assigned: string[];
}) {
  const [state, action] = useActionState<FormState, FormData>(setCrewEventsAction.bind(null, orgSlug, userId), {});
  return (
    <details className="mt-2">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-ink-2">
        {assigned.length} event ditugaskan · Atur
      </summary>
      <form action={action} className="mt-2 flex flex-col gap-3">
        <EventChecks events={events} checked={assigned} />
        <SubmitButton variant="secondary" className="self-start" pendingLabel="Menyimpan…">
          Simpan penugasan
        </SubmitButton>
        {state.error ? (
          <p role="alert" className="field-error">
            {state.error}
          </p>
        ) : null}
      </form>
    </details>
  );
}

export function RemoveCrewButton({ orgSlug, userId }: { orgSlug: string; userId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-text text-sm"
      disabled={pending}
      onClick={() => {
        if (confirm("Hapus panitia ini dari organisasi? Aksesnya ke scanner langsung dicabut.")) {
          start(() => removeCrewAction(orgSlug, userId));
        }
      }}
    >
      {pending ? "Menghapus…" : "Hapus"}
    </button>
  );
}
