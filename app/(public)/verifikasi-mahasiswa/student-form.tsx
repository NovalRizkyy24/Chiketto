"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StudentForm({ back }: { back: string }) {
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Koneksi terputus. Coba lagi.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function sendCode(fd: FormData) {
    const json = await post("/api/student-verification", { email: fd.get("email") });
    if (json) setSentTo(json.email);
  }

  async function confirm(fd: FormData) {
    const json = await post("/api/student-verification/confirm", { code: fd.get("code") });
    if (json) {
      router.push(back);
      router.refresh();
    }
  }

  return (
    <div className="mt-10">
      {!sentTo ? (
        <form action={sendCode} className="flex flex-col gap-4">
          <label className="field">
            <span className="label">Email kampus</span>
            <input
              name="email"
              type="email"
              required
              className="input"
              aria-invalid={Boolean(error)}
              aria-describedby="err"
            />
          </label>
          <button type="submit" className="btn btn-primary self-start" disabled={busy}>
            {busy ? "Mengirim…" : "Kirim kode"}
          </button>
        </form>
      ) : (
        <form action={confirm} className="flex flex-col gap-4">
          <p className="text-ink-2">
            Kode dikirim ke <span className="font-mono break-anywhere">{sentTo}</span>. Berlaku 10 menit.
          </p>
          <label className="field">
            <span className="label">Kode verifikasi</span>
            <input
              name="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
              className="input font-mono tracking-[0.2em]"
              aria-invalid={Boolean(error)}
              aria-describedby="err"
            />
          </label>
          <div className="flex items-center gap-6">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Memeriksa…" : "Verifikasi"}
            </button>
            <button type="button" className="btn-text text-sm" onClick={() => setSentTo(null)}>
              Ganti email
            </button>
          </div>
        </form>
      )}
      <p id="err" role="alert" className="field-error mt-3 empty:hidden">
        {error}
      </p>
    </div>
  );
}
