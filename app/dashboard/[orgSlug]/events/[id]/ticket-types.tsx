"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { formatRupiah } from "@/lib/format-rupiah";
import {
  deleteTicketTypeAction,
  restoreTicketTypeAction,
  saveTicketTypeAction,
  type FormState,
} from "../../actions";

type TT = {
  id: string;
  name: string;
  description: string;
  price: number;
  quota: number;
  sold: number;
  reserved: number;
  studentOnly: boolean;
  salesStart: string;
  salesEnd: string;
};

type Props = {
  orgSlug: string;
  eventId: string;
  types: TT[];
  disabled: boolean;
  defaults: { salesStart: string; salesEnd: string };
};

function TicketTypeForm({
  orgSlug,
  eventId,
  tt,
  defaults,
  onSaved,
}: {
  orgSlug: string;
  eventId: string;
  tt?: TT;
  defaults: Props["defaults"];
  onSaved?: () => void;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveTicketTypeAction.bind(null, orgSlug, eventId, tt?.id),
    {},
  );
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && state.savedAt) {
      if (!tt) form.current?.reset();
      onSaved?.();
    }
  }, [state.savedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const fe = state.fieldErrors ?? {};
  const v = (k: keyof TT, fallback?: string) => state.values?.[k] ?? (tt ? String(tt[k]) : fallback);
  const locked = Boolean(tt && tt.sold > 0);
  const e = (k: string) => (fe[k] ? <span className="field-error">{fe[k]}</span> : null);

  return (
    <form ref={form} action={action} className="grid gap-4 py-4 sm:grid-cols-2">
      <label className="field">
        <span className="label">Nama</span>
        <input name="name" required defaultValue={v("name")} placeholder="Presale" className="input" aria-invalid={Boolean(fe.name)} />
        {e("name")}
      </label>
      <label className="field">
        <span className="label">Keterangan (opsional)</span>
        <input name="description" defaultValue={v("description")} className="input" />
      </label>
      <label className="field">
        <span className="label">Harga (Rp, 0 = gratis)</span>
        <input
          name="price"
          type="number"
          min={0}
          step={500}
          required
          defaultValue={v("price", "0")}
          readOnly={locked}
          className="input font-mono"
          aria-invalid={Boolean(fe.price)}
        />
        {locked ? <span className="hint">Harga terkunci karena sudah ada tiket terjual.</span> : e("price")}
      </label>
      <label className="field">
        <span className="label">Kuota</span>
        <input name="quota" type="number" min={1} required defaultValue={v("quota", "100")} className="input font-mono" aria-invalid={Boolean(fe.quota)} />
        {e("quota")}
      </label>
      <label className="field">
        <span className="label">Mulai dijual (WIB)</span>
        <input name="salesStart" type="datetime-local" required defaultValue={v("salesStart", defaults.salesStart)} className="input" />
        {e("salesStart")}
      </label>
      <label className="field">
        <span className="label">Berakhir (WIB)</span>
        <input name="salesEnd" type="datetime-local" required defaultValue={v("salesEnd", defaults.salesEnd)} className="input" />
        {e("salesEnd")}
      </label>
      <label className="flex min-h-11 items-center gap-3 sm:col-span-2">
        <input
          name="studentOnly"
          type="checkbox"
          defaultChecked={state.values ? state.values.studentOnly === "on" : tt?.studentOnly}
          className="size-5 accent-[var(--color-ink)]"
        />
        <span>Khusus mahasiswa terverifikasi</span>
      </label>
      <div className="flex items-center gap-4 sm:col-span-2">
        <SubmitButton variant={tt ? "secondary" : "primary"} pendingLabel="Menyimpan…">
          {tt ? "Simpan jenis tiket" : "Tambah jenis tiket"}
        </SubmitButton>
        {state.error ? (
          <p role="alert" className="field-error">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function TicketTypeManager({ orgSlug, eventId, types, disabled, defaults }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ snapshot: unknown; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!snack) return;
    const t = setTimeout(() => setSnack(null), 8000);
    return () => clearTimeout(t);
  }, [snack]);

  const remove = (tt: TT) => {
    setError(null);
    setHidden((h) => new Set(h).add(tt.id)); // optimistis
    startTransition(async () => {
      const res = await deleteTicketTypeAction(orgSlug, eventId, tt.id);
      if (res.ok) setSnack({ snapshot: res.snapshot, name: tt.name });
      else {
        setHidden((h) => {
          const n = new Set(h);
          n.delete(tt.id);
          return n;
        });
        setError(res.error);
      }
    });
  };

  const undo = () => {
    if (!snack) return;
    const s = snack.snapshot;
    setSnack(null);
    startTransition(async () => {
      const res = await restoreTicketTypeAction(orgSlug, eventId, s);
      if (!res.ok) setError(res.error);
    });
  };

  const visible = types.filter((t) => !hidden.has(t.id));

  return (
    <div className="mt-4">
      <ul className="border-t border-rule">
        {visible.map((t) => (
          <li key={t.id} className="border-b border-rule">
            <div className="flex min-h-[56px] flex-wrap items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-medium break-anywhere">
                  {t.name}
                  {t.studentOnly ? <span className="ml-2 text-sm font-normal text-ink-3">khusus mahasiswa</span> : null}
                </p>
                <p className="font-mono text-sm tabular text-ink-3">
                  {formatRupiah(t.price)} · {t.sold}/{t.quota}
                </p>
              </div>
              {!disabled ? (
                <div className="flex gap-5">
                  <button type="button" className="btn-text text-sm" onClick={() => setEditing(editing === t.id ? null : t.id)} aria-expanded={editing === t.id}>
                    {editing === t.id ? "Tutup" : "Ubah"}
                  </button>
                  {t.sold + t.reserved === 0 ? (
                    <button type="button" className="btn-text text-sm" onClick={() => remove(t)}>
                      Hapus
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {editing === t.id ? (
              <TicketTypeForm orgSlug={orgSlug} eventId={eventId} tt={t} defaults={defaults} onSaved={() => setEditing(null)} />
            ) : null}
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="field-error mt-3">
          {error}
        </p>
      ) : null}

      {!disabled ? (
        <div className="mt-8">
          <h3 className="font-body text-lg font-medium">Jenis tiket baru</h3>
          <TicketTypeForm orgSlug={orgSlug} eventId={eventId} defaults={defaults} />
        </div>
      ) : null}

      {snack ? (
        <div
          role="status"
          className="fixed inset-x-5 bottom-[max(20px,env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-[480px] items-center justify-between gap-4 bg-ink px-5 py-3 text-paper"
        >
          <span>Jenis tiket dihapus</span>
          <button type="button" onClick={undo} className="min-h-11 font-bold underline underline-offset-4">
            Batalkan
          </button>
        </div>
      ) : null}
    </div>
  );
}
