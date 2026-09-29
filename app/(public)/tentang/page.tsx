import type { Metadata } from "next";
import { TextPage } from "@/components/text-page";

export const metadata: Metadata = { title: "Tentang" };

export default function AboutPage() {
  return (
    <TextPage
      title="Tentang Chiketto"
      sections={[
        {
          body: "Chiketto (チケット, \"tiket\") adalah tempat himpunan, UKM, dan BEM menjual tiket event kampus. Mahasiswa membeli dan menyimpan e-tiket QR, lalu panitia memindainya di pintu masuk.",
        },
        {
          heading: "Kenapa dibuat",
          body: "Selama ini penjualan tiket event kampus memakai Google Form, transfer manual, dan cek bukti bayar satu per satu. Chiketto menggantinya: pembayaran terverifikasi otomatis, e-tiket terbit sendiri, dan check-in cukup sekali pindai.",
        },
      ]}
    />
  );
}
