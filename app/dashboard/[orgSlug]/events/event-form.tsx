"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "../actions";

type Values = {
  title: string;
  category: string;
  description: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  maxPerUser: number;
  posterUrl: string;
  posterAlt: string;
};

const CATS = [
  ["KONSER", "Konser"],
  ["SEMINAR", "Seminar"],
  ["WORKSHOP", "Workshop"],
  ["LOMBA", "Lomba"],
  ["LAINNYA", "Lainnya"],
];

export function EventForm({
  action,
  values,
  submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  values?: Values;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const v = (k: keyof Values) => state.values?.[k] ?? (values ? String(values[k]) : undefined);
  const err = (k: string) =>
    fe[k] ? (
      <span id={`${k}-err`} className="field-error">
        {fe[k]}
      </span>
    ) : null;
  const a = (k: string) => ({ "aria-invalid": Boolean(fe[k]), "aria-describedby": fe[k] ? `${k}-err` : undefined });

  return (
    <form action={formAction} className="flex max-w-[560px] flex-col gap-6">
      <label className="field">
        <span className="label">Judul event</span>
        <input name="title" required defaultValue={v("title")} className="input" {...a("title")} />
        {err("title")}
      </label>
      <label className="field">
        <span className="label">Kategori</span>
        <select name="category" defaultValue={v("category") ?? "KONSER"} className="input">
          {CATS.map(([val, l]) => (
            <option key={val} value={val}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="label">Tempat</span>
        <input name="venue" required defaultValue={v("venue")} className="input" {...a("venue")} />
        {err("venue")}
      </label>
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="field">
          <span className="label">Mulai (WIB)</span>
          <input name="startsAt" type="datetime-local" required defaultValue={v("startsAt")} className="input" {...a("startsAt")} />
          {err("startsAt")}
        </label>
        <label className="field">
          <span className="label">Selesai (WIB)</span>
          <input name="endsAt" type="datetime-local" required defaultValue={v("endsAt")} className="input" {...a("endsAt")} />
          {err("endsAt")}
        </label>
      </div>
      <label className="field">
        <span className="label">Deskripsi</span>
        <textarea name="description" required defaultValue={v("description")} className="input" {...a("description")} />
        {err("description")}
      </label>
      <label className="field">
        <span className="label">Batas tiket per akun</span>
        <input
          name="maxPerUser"
          type="number"
          min={1}
          max={20}
          required
          defaultValue={v("maxPerUser") ?? 4}
          className="input w-32 font-mono"
          {...a("maxPerUser")}
        />
        {err("maxPerUser")}
      </label>
      <label className="field">
        <span className="label">Poster (rasio 4:5, JPG/PNG/WebP, maks. 2 MB)</span>
        <input name="poster" type="file" accept="image/jpeg,image/png,image/webp" className="input" />
        {values?.posterUrl ? <span className="hint">Kosongkan untuk tetap memakai poster sekarang.</span> : null}
        <input type="hidden" name="posterUrl" value={values?.posterUrl ?? ""} />
      </label>
      <label className="field">
        <span className="label">Deskripsi poster (untuk pembaca layar, opsional)</span>
        <input name="posterAlt" defaultValue={v("posterAlt")} className="input" />
      </label>

      {state.error ? (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      ) : null}
      <SubmitButton className="self-start" pendingLabel="Menyimpan…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
