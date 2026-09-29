import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cek email kamu" };

export default function CheckEmailPage() {
  return (
    <div className="page">
      <div className="max-w-[36em]">
        <h1 className="text-3xl">Cek email kamu</h1>
        <p className="mt-4 text-ink-2">
          Tautan masuk sudah dikirim. Buka email dari Chiketto lalu ketuk tautannya. Jika tidak ada di kotak masuk,
          periksa folder spam.
        </p>
        {process.env.NODE_ENV !== "production" ? (
          <p className="mt-6 text-sm text-ink-3">
            Mode pengembangan: email tertangkap di Mailpit,{" "}
            <a href="http://localhost:8025" className="btn-text">
              localhost:8025
            </a>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}
