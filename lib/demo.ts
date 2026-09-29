/** Akun demo untuk tiga peran (dibuat oleh prisma/seed.ts). */
export const DEMO_ACCOUNTS = [
  { email: "pembeli@demo.chiketto.id", label: "Pembeli", note: "Mahasiswa terverifikasi" },
  { email: "penyelenggara@demo.chiketto.id", label: "Penyelenggara", note: "HIMA Sistem Informasi" },
  { email: "panitia@demo.chiketto.id", label: "Panitia", note: "Scanner Malam Akustik" },
] as const;

export const demoLoginEnabled = () => process.env.DEMO_LOGIN === "true";
