import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/permissions";
import { StudentForm } from "./student-form";

export const metadata: Metadata = { title: "Verifikasi mahasiswa", robots: { index: false } };

const safe = (v?: string) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/");

export default async function StudentVerificationPage({ searchParams }: { searchParams: Promise<{ kembali?: string }> }) {
  const back = safe((await searchParams).kembali);
  const user = await requireUserPage("/verifikasi-mahasiswa");
  const campuses = await db.campus.findMany({ select: { name: true, emailDomain: true } });

  return (
    <div className="page">
      <div className="max-w-120">
        <h1 className="text-3xl">Verifikasi mahasiswa</h1>
        {user.studentVerifiedAt ? (
          <>
            <p className="mt-4 text-ink-2">
              Status mahasiswa kamu sudah terverifikasi lewat <span className="font-mono break-anywhere">{user.studentEmail}</span>.
            </p>
            <Link href={back} className="btn btn-secondary mt-8">
              Kembali
            </Link>
          </>
        ) : (
          <>
            <p className="mt-4 text-ink-2">
              Kami kirim kode 6 angka ke email kampus kamu. Setelah terverifikasi, harga khusus mahasiswa terbuka.
            </p>
            <p className="mt-2 text-sm text-ink-3">
              Domain yang diterima: {campuses.map((c) => `@${c.emailDomain}`).join(", ")}
            </p>
            <StudentForm back={back} />
          </>
        )}
      </div>
    </div>
  );
}
