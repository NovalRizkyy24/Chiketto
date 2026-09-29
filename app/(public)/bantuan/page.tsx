import type { Metadata } from "next";
import { TextPage } from "@/components/text-page";

export const metadata: Metadata = { title: "Bantuan" };

export default function HelpPage() {
  return (
    <TextPage
      title="Bantuan"
      sections={[
        {
          heading: "Berapa lama tiket ditahan saat checkout?",
          body: "15 menit sejak pesanan dibuat. Jika pembayaran belum selesai dalam waktu itu, kuota dilepas dan kamu bisa memesan lagi selama masih tersedia.",
        },
        {
          heading: "Sudah bayar tapi tiket belum muncul",
          body: "Status pembayaran dikonfirmasi langsung oleh Midtrans, biasanya dalam hitungan detik. Buka halaman checkout atau Tiket Saya, halaman akan berubah sendiri. Jika lebih dari 15 menit, hubungi penyelenggara dengan menyebutkan kode pesanan (CHK-…).",
        },
        {
          heading: "Bagaimana membuka harga mahasiswa?",
          body: "Masuk, lalu buka Verifikasi mahasiswa dan masukkan email kampus. Kami kirim kode 6 angka yang berlaku 10 menit.",
        },
        {
          heading: "Tiket bisa dibuka tanpa internet?",
          body: "Bisa. Buka Tiket Saya sekali saat online, setelah itu halaman dan QR-nya tersimpan di perangkat. E-tiket juga dikirim ke email sebagai PDF.",
        },
        {
          heading: "Kamera panitia tidak bisa membaca QR",
          body: "Sebutkan kode tiket di bawah QR (misalnya K7M-2QX). Panitia bisa mengetiknya manual.",
        },
      ]}
    />
  );
}
