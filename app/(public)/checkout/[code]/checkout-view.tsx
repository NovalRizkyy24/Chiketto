"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatRupiah } from "@/lib/format-rupiah";

type Status = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "REFUNDED";

type Props = {
  order: {
    code: string;
    status: Status;
    total: number;
    expiresAt: string;
    items: { name: string; qty: number; unitPrice: number }[];
  };
  event: { title: string; slug: string; when: string; venue: string };
  payment: { midtrans: boolean; clientKey: string; snapUrl: string; mock: boolean };
};

type SnapCallbacks = {
  onSuccess?: () => void;
  onPending?: () => void;
  onError?: () => void;
  onClose?: () => void;
};
declare global {
  interface Window {
    snap?: { pay: (token: string, cb: SnapCallbacks) => void };
  }
}

function loadSnap(src: string, clientKey: string): Promise<void> {
  if (window.snap) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.dataset.clientKey = clientKey;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("snap"));
    document.body.appendChild(s);
  });
}

function useCountdown(expiresAt: string, active: boolean) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [expiresAt, active]);
  return left;
}

export function CheckoutView({ order, event, payment }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(order.status);
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState<null | "pay" | "cancel" | "mock">(null);
  const [error, setError] = useState<string | null>(null);

  const left = useCountdown(order.expiresAt, status === "PENDING");
  const locallyExpired = status === "PENDING" && left === 0;
  const mm = String(Math.floor(left / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, "0");
  const minutesLeft = Math.ceil(left / 60_000);

  // Pengumuman pembaca layar: tiap menit, bukan tiap detik.
  const [announce, setAnnounce] = useState("");
  const lastMinute = useRef<number | null>(null);
  useEffect(() => {
    if (status !== "PENDING" || lastMinute.current === minutesLeft) return;
    lastMinute.current = minutesLeft;
    setAnnounce(minutesLeft > 0 ? `Tiket ditahan ${minutesLeft} menit lagi.` : "Waktu penahanan tiket habis.");
  }, [minutesLeft, status]);

  const poll = useCallback(async () => {
    const res = await fetch(`/api/orders/${order.code}`, { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { status: Status };
    setStatus(json.status);
  }, [order.code]);

  // Halaman berubah sendiri setelah webhook memproses pembayaran.
  useEffect(() => {
    if (status !== "PENDING") return;
    const id = setInterval(poll, waiting ? 3000 : 10_000);
    return () => clearInterval(id);
  }, [status, waiting, poll]);

  useEffect(() => {
    if (status === "PAID") router.refresh();
  }, [status, router]);

  async function pay() {
    setBusy("pay");
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.code}/pay`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await loadSnap(payment.snapUrl, payment.clientKey);
      window.snap!.pay(json.snapToken, {
        onSuccess: () => setWaiting(true),
        onPending: () => setWaiting(true),
        onError: () => setError("Pembayaran gagal diproses. Coba metode lain."),
        onClose: () => poll(),
      });
      setWaiting(true);
    } catch (e) {
      setError(e instanceof Error && e.message !== "snap" ? e.message : "Jendela pembayaran gagal dimuat. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  async function mockPay() {
    setBusy("mock");
    setError(null);
    const res = await fetch("/api/dev/mock-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: order.code }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error);
    await poll();
    setBusy(null);
  }

  async function cancel() {
    setBusy("cancel");
    const res = await fetch(`/api/orders/${order.code}/cancel`, { method: "POST" });
    if (!res.ok) setError((await res.json()).error);
    await poll();
    setBusy(null);
  }

  const step = status === "PAID" ? 2 : status === "PENDING" ? 1 : 0;
  const steps = ["Pesanan", "Bayar", "Selesai"];

  return (
    <>
      <ol className="flex gap-2 text-sm" aria-label="Langkah checkout">
        {steps.map((s, i) => (
          <li key={s} className={i === step ? "font-bold text-ink" : "text-ink-3"} aria-current={i === step ? "step" : undefined}>
            {i > 0 ? <span className="mr-2 font-normal text-ink-3" aria-hidden="true">·</span> : null}
            {s}
          </li>
        ))}
      </ol>

      <h1 className="mt-10 text-3xl break-anywhere">{event.title}</h1>
      <p className="mt-3 text-sm text-ink-2">
        {event.when}
        <br />
        {event.venue}
      </p>

      <dl className="mt-10 border-t border-rule">
        {order.items.map((i) => (
          <div key={i.name} className="flex justify-between gap-4 border-b border-rule py-3">
            <dt>
              {i.name} <span className="font-mono text-ink-3">× {i.qty}</span>
            </dt>
            <dd className="font-mono tabular">{formatRupiah(i.qty * i.unitPrice)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 py-4">
          <dt className="text-sm text-ink-3">Total</dt>
          <dd className={`font-mono text-2xl tabular ${status === "PENDING" && !locallyExpired ? "text-accent" : ""}`}>
            {formatRupiah(order.total)}
          </dd>
        </div>
      </dl>
      <p className="text-sm text-ink-3">
        Kode pesanan <span className="font-mono text-ink">{order.code}</span>
      </p>

      <div className="mt-10" aria-live="polite">
        {status === "PAID" ? (
          <>
            <p className="text-lg">{order.total === 0 ? "Tiket kamu sudah terbit." : "Pembayaran diterima. Tiket kamu sudah terbit."}</p>
            <p className="mt-2 text-ink-2">E-tiket juga dikirim ke email kamu.</p>
            <Link href="/tiket-saya" className="btn btn-primary mt-6">
              Lihat tiket
            </Link>
          </>
        ) : status === "EXPIRED" || locallyExpired ? (
          <>
            <p className="text-ink-2">
              Waktu penahanan tiket habis dan kuotanya sudah dilepas. Kamu bisa memesan lagi jika masih tersedia.
            </p>
            <Link href={`/events/${event.slug}`} className="btn btn-secondary mt-6">
              Pesan lagi
            </Link>
          </>
        ) : status === "CANCELLED" ? (
          <>
            <p className="text-ink-2">Pesanan ini dibatalkan dan kuotanya sudah dilepas.</p>
            <Link href={`/events/${event.slug}`} className="btn btn-secondary mt-6">
              Kembali ke event
            </Link>
          </>
        ) : status === "REFUNDED" ? (
          <p className="text-ink-2">Dana pesanan ini sudah dikembalikan.</p>
        ) : (
          <>
            <p
              className={`font-mono tabular ${left < 120_000 ? "text-accent" : "text-ink"}`}
              aria-hidden="true"
              suppressHydrationWarning
            >
              Tiket ditahan {mm}:{ss}
            </p>
            <p className="sr-only" aria-live="polite">
              {announce}
            </p>
            {waiting ? (
              <p className="mt-4 text-ink-2">
                Selesaikan pembayaran di jendela Midtrans. Halaman ini akan berubah sendiri setelah pembayaran diterima.
              </p>
            ) : null}
            <div className="mt-6 flex flex-col items-start gap-4">
              {payment.midtrans ? (
                <button type="button" className="btn btn-primary" onClick={pay} disabled={busy !== null} aria-busy={busy === "pay"}>
                  {busy === "pay" ? "Memproses…" : `Bayar ${formatRupiah(order.total)}`}
                </button>
              ) : payment.mock ? (
                <>
                  <button type="button" className="btn btn-primary" onClick={mockPay} disabled={busy !== null} aria-busy={busy === "mock"}>
                    {busy === "mock" ? "Memproses…" : `Bayar ${formatRupiah(order.total)}`}
                  </button>
                  <p className="text-xs text-ink-3">
                    Mode pengembangan: Midtrans belum dikonfigurasi, jadi tombol ini menyimulasikan pembayaran berhasil.
                  </p>
                </>
              ) : (
                <p className="text-ink-2">Pembayaran online belum tersedia. Hubungi penyelenggara.</p>
              )}
              <button type="button" className="btn-text text-sm" onClick={cancel} disabled={busy !== null}>
                {busy === "cancel" ? "Membatalkan…" : "Batalkan pesanan"}
              </button>
            </div>
          </>
        )}
        <p role="alert" className="field-error mt-4 empty:hidden">
          {error}
        </p>
      </div>
    </>
  );
}
