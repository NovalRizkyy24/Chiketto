import type { Metadata } from "next";
import { TextPage } from "@/components/text-page";

export const metadata: Metadata = { title: "Untuk Penyelenggara" };

export default function OrganizerInfoPage() {
  return (
    <TextPage
      title="Untuk Penyelenggara"
      sections={[
        {
          body: "Himpunan, UKM, dan BEM bisa membuat event, mengatur jenis tiket (harga, kuota, periode jual, khusus mahasiswa), memantau penjualan, dan mengundang panitia untuk memindai tiket di pintu.",
        },
        {
          heading: "Cara mulai",
          body: "Organisasi perlu diverifikasi admin platform sebelum bisa menerbitkan event. Kirim nama organisasi dan email pengurus ke admin kampus. Setelah diverifikasi, pengurus bisa masuk dan membuka Dashboard.",
        },
        {
          heading: "Yang kamu dapat",
          body: "Pembayaran QRIS, virtual account, dan e-wallet lewat Midtrans.\nKuota aman dari rebutan: tiket tidak pernah terjual melebihi kuota.\nDaftar peserta yang bisa diunduh sebagai Excel.\nScanner di HP panitia, dengan input kode manual sebagai cadangan.",
        },
      ]}
    />
  );
}
