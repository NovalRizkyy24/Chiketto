"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { QuotaBar } from "@/components/quota-bar";
import { formatRupiah } from "@/lib/format-rupiah";

export type PickerTicketType = {
  id: string;
  name: string;
  note: string;
  price: number;
  quota: number;
  used: number;
  remaining: number;
  studentOnly: boolean;
  state: "open" | "upcoming" | "closed" | "soldout";
};

type Props = {
  eventId: string;
  types: PickerTicketType[];
  maxPerUser: number;
  allowance: number;
  isLoggedIn: boolean;
  isStudent: boolean;
  loginHref: string;
  verifyHref: string;
  children?: React.ReactNode;
};

export function TicketPicker(p: Props) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = Object.values(qty).reduce((s, n) => s + n, 0);
  const total = p.types.reduce((s, t) => s + (qty[t.id] ?? 0) * t.price, 0);
  const atLimit = count >= p.allowance;

  const change = (id: string, delta: number) => {
    setError(null);
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + delta) }));
  };

  async function buy() {
    if (!p.isLoggedIn) {
      router.push(p.loginHref);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: p.eventId,
          items: Object.entries(qty)
            .filter(([, n]) => n > 0)
            .map(([ticketTypeId, n]) => ({ ticketTypeId, qty: n })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Pesanan gagal dibuat. Coba lagi.");
        router.refresh();
        return;
      }
      router.push(`/checkout/${json.code}`);
    } catch {
      setError("Koneksi terputus. Periksa internet kamu lalu coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <ul className="mt-4 border-t border-rule">
        {p.types.map((t) => {
          const n = qty[t.id] ?? 0;
          const lockedStudent = t.studentOnly && !p.isStudent;
          const buyable = t.state === "open" && !lockedStudent;
          const showRemaining = t.state === "open" && t.remaining <= t.quota * 0.2;
          const plusDisabled = !buyable || atLimit || n >= t.remaining;
          return (
            <li key={t.id} className="border-b border-rule py-5">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-36 flex-1 wrap-anywhere">
                  <p className={`font-medium ${buyable ? "" : "text-ink-3"}`}>{t.name}</p>
                  <p className="text-sm text-ink-3">{t.note}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="font-mono tabular">{formatRupiah(t.price)}</span>
                  {buyable ? (
                    <div className="flex items-center" role="group" aria-label={`Jumlah ${t.name}`}>
                      <button
                        type="button"
                        className="flex size-11 items-center justify-center rounded-sm border border-rule-strong text-lg hover:bg-paper-2 disabled:border-rule disabled:text-ink-3"
                        onClick={() => change(t.id, -1)}
                        disabled={n === 0}
                        aria-label={`Kurangi ${t.name}`}
                      >
                        −
                      </button>
                      <output className="w-8 text-center font-mono tabular" aria-live="polite">
                        {n}
                      </output>
                      <button
                        type="button"
                        className="flex size-11 items-center justify-center rounded-sm border border-rule-strong text-lg hover:bg-paper-2 disabled:border-rule disabled:text-ink-3"
                        onClick={() => change(t.id, 1)}
                        disabled={plusDisabled}
                        aria-label={`Tambah ${t.name}`}
                      >
                        +
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <div className="flex-1">
                  <QuotaBar used={t.used} quota={t.quota} label={`Kuota ${t.name} terpakai`} />
                </div>
                <span className="shrink-0 text-xs text-ink-3">
                  {t.state === "soldout"
                    ? "Habis"
                    : showRemaining
                      ? `Sisa ${t.remaining} dari ${t.quota}`
                      : ""}
                </span>
              </div>

              {lockedStudent && t.state === "open" ? (
                <p className="mt-2 text-sm text-ink-2">
                  Tiket ini khusus mahasiswa.{" "}
                  {p.isLoggedIn ? (
                    <Link href={p.verifyHref} className="btn-text">
                      Verifikasi email kampus
                    </Link>
                  ) : (
                    <Link href={p.loginHref} className="btn-text">
                      Masuk untuk verifikasi
                    </Link>
                  )}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-3">
        {p.allowance < p.maxPerUser
          ? `Maksimal ${p.maxPerUser} tiket per akun. Kamu masih bisa membeli ${p.allowance} tiket lagi.`
          : `Maksimal ${p.maxPerUser} tiket per akun`}
      </p>

      {p.children}

      <div className="sticky bottom-0 z-10 -mx-5 mt-16 border-t border-rule bg-paper px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:mx-0 md:px-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-ink-3">Total</p>
            <p className={`font-mono text-2xl tabular ${count === 0 ? "text-ink-3" : "text-accent"}`} aria-live="polite">
              {count === 0 ? "—" : formatRupiah(total)}
            </p>
          </div>
          <button type="button" className="btn btn-primary" disabled={count === 0 || pending} onClick={buy} aria-busy={pending}>
            <span className="grid">
              <span className={`col-start-1 row-start-1 ${pending ? "invisible" : ""}`}>Beli tiket</span>
              <span className={`col-start-1 row-start-1 ${pending ? "" : "invisible"}`}>Memproses…</span>
            </span>
          </button>
        </div>
        <p role="alert" className="field-error mt-2 empty:hidden">
          {error}
        </p>
      </div>
    </>
  );
}
