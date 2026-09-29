"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BangIcon, CheckIcon, CrossIcon, QuestionIcon } from "@/components/icons";
import type { CheckinResult, CheckinVerdict } from "@/lib/checkin";

type Counts = { checkedIn: number; total: number };
type Result = CheckinResult & { counts?: Counts };

const VERDICT_MS = 1500;

const VIEW: Record<
  CheckinVerdict,
  { label: string; bg: string; fg: string; Icon: typeof CheckIcon; vibrate: number[] }
> = {
  VALID: { label: "VALID", bg: "var(--color-ok)", fg: "var(--color-on-verdict)", Icon: CheckIcon, vibrate: [200] },
  SUDAH_DIPAKAI: {
    label: "SUDAH MASUK",
    bg: "var(--color-warn)",
    fg: "var(--color-on-warn)",
    Icon: BangIcon,
    vibrate: [80, 60, 80, 60, 80],
  },
  BUKAN_EVENT_INI: {
    label: "EVENT LAIN",
    bg: "var(--color-accent)",
    fg: "var(--color-on-verdict)",
    Icon: CrossIcon,
    vibrate: [80, 60, 80, 60, 80],
  },
  TIDAK_DITEMUKAN: {
    label: "TIDAK DIKENAL",
    bg: "var(--color-ink)",
    fg: "var(--color-paper)",
    Icon: QuestionIcon,
    vibrate: [80, 60, 80, 60, 80],
  },
};

function hhmm(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
}

function detail(r: Result) {
  switch (r.verdict) {
    case "VALID":
      return `${r.holderName} · ${r.ticketTypeName}`;
    case "SUDAH_DIPAKAI":
      return `Dipindai pukul ${hhmm(r.checkedInAt)}${r.checkedInByName ? ` oleh ${r.checkedInByName}` : ""}`;
    case "BUKAN_EVENT_INI":
      return r.otherEventTitle ?? "";
    case "TIDAK_DITEMUKAN":
      return r.note ?? "Minta pembeli membuka tiket dari aplikasi";
  }
}

export function Scanner({ eventId, eventTitle, initialCounts }: { eventId: string; eventTitle: string; initialCounts: Counts }) {
  const [counts, setCounts] = useState(initialCounts);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [netError, setNetError] = useState<string | null>(null);
  const busy = useRef(false);
  const lastToken = useRef<{ value: string; at: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setResult(null);
    busy.current = false;
  }, []);

  const submit = useCallback(
    async (payload: { token?: string; code?: string }) => {
      if (busy.current) return;
      busy.current = true;
      setNetError(null);
      try {
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Gagal memeriksa tiket.");
        const r = json as Result;
        if (r.counts) setCounts(r.counts);
        setResult(r);
        navigator.vibrate?.(VIEW[r.verdict].vibrate);
        timer.current = setTimeout(dismiss, VERDICT_MS);
      } catch (e) {
        setNetError(e instanceof Error ? e.message : "Koneksi terputus. Coba lagi.");
        busy.current = false;
      }
    },
    [eventId, dismiss],
  );

  useEffect(() => {
    let stopped = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (stopped) return;
      scanner = new Html5Qrcode("reader", { verbose: false });
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, aspectRatio: 1 },
          (text) => {
            const now = Date.now();
            // Abaikan QR yang sama yang masih di depan kamera setelah verdict.
            if (lastToken.current && lastToken.current.value === text && now - lastToken.current.at < 4000) return;
            lastToken.current = { value: text, at: now };
            void submit({ token: text });
          },
          () => {},
        );
      } catch {
        setCamError("Kamera tidak bisa dibuka. Izinkan akses kamera di browser, atau ketik kode manual.");
      }
    })();
    return () => {
      stopped = true;
      if (scanner?.isScanning) scanner.stop().catch(() => {});
    };
  }, [submit]);

  const view = result ? VIEW[result.verdict] : null;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "var(--color-on-warn)", color: "var(--color-on-verdict)" }}
    >
      <header className="flex items-start justify-between gap-4 px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3">
        <div className="min-w-0">
          <p className="truncate text-sm">{eventTitle}</p>
          <p className="font-mono text-lg tabular" aria-label={`Sudah masuk ${counts.checkedIn} dari ${counts.total}`}>
            Masuk {counts.checkedIn} / {counts.total}
          </p>
        </div>
        <Link href="/scan" className="inline-flex min-h-14 items-center text-sm underline underline-offset-4">
          Ganti event
        </Link>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div id="reader" className="absolute inset-0 [&_video]:h-full! [&_video]:w-full! [&_video]:object-cover" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="aspect-square w-[min(70vw,320px)] border-2" style={{ borderColor: "var(--color-on-verdict)" }} />
        </div>
        {camError ? (
          <p className="absolute inset-x-5 top-1/2 -translate-y-1/2 text-center" role="alert">
            {camError}
          </p>
        ) : null}
      </div>

      <footer className="px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        {netError ? (
          <p role="alert" className="mb-2 text-sm">
            {netError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setManual(true)}
          className="min-h-14 w-full text-base font-bold underline underline-offset-4"
        >
          Ketik kode manual
        </button>
      </footer>

      {manual ? (
        <div className="fixed inset-0 z-10 flex flex-col justify-end bg-paper text-ink" role="dialog" aria-modal="true" aria-labelledby="manual-title">
          <form
            className="flex flex-col gap-4 p-5 pb-[max(20px,env(safe-area-inset-bottom))]"
            onSubmit={(e) => {
              e.preventDefault();
              const code = String(new FormData(e.currentTarget).get("code") ?? "");
              setManual(false);
              void submit({ code });
            }}
          >
            <h2 id="manual-title" className="text-xl">
              Ketik kode tiket
            </h2>
            <label className="field">
              <span className="label">Kode di bawah QR, misalnya K7M-2QX</span>
              <input
                name="code"
                autoFocus
                required
                autoCapitalize="characters"
                autoComplete="off"
                className="input font-mono text-2xl tracking-[0.08em] uppercase"
              />
            </label>
            <div className="flex gap-4">
              <button type="submit" className="btn btn-primary min-h-14 flex-1">
                Periksa tiket
              </button>
              <button type="button" className="btn btn-secondary min-h-14" onClick={() => setManual(false)}>
                Tutup
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div aria-live="assertive" className="sr-only">
        {result && view ? `${view.label}. ${detail(result)}` : ""}
      </div>

      {result && view ? (
        <button
          type="button"
          onClick={dismiss}
          className="verdict-in fixed inset-0 z-20 flex flex-col items-center justify-center gap-4 px-6 text-center"
          style={{ background: view.bg, color: view.fg }}
          aria-label="Kembali ke kamera"
        >
          <view.Icon size={72} />
          <span className="font-display text-verdict font-bold leading-none">{view.label}</span>
          <span className="max-w-[28em] text-lg break-anywhere">{detail(result)}</span>
          {result.ticketCode ? <span className="font-mono text-sm opacity-80">{result.ticketCode}</span> : null}
        </button>
      ) : null}
    </div>
  );
}
