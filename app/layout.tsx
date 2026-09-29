import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Font di-host sendiri (subset latin, lisensi OFL) agar build tidak bergantung jaringan.
const shippori = localFont({
  src: [
    { path: "./fonts/ShipporiMinchoB1-500.woff2", weight: "500" },
    { path: "./fonts/ShipporiMinchoB1-700.woff2", weight: "700" },
  ],
  variable: "--font-shippori",
  display: "swap",
});
const zen = localFont({
  src: [
    { path: "./fonts/ZenKakuGothicNew-400.woff2", weight: "400" },
    { path: "./fonts/ZenKakuGothicNew-500.woff2", weight: "500" },
    { path: "./fonts/ZenKakuGothicNew-700.woff2", weight: "700" },
  ],
  variable: "--font-zen",
  display: "swap",
});
const dmMono = localFont({
  src: [
    { path: "./fonts/DMMono-400.woff2", weight: "400" },
    { path: "./fonts/DMMono-500.woff2", weight: "500" },
  ],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Chiketto · Tiket event kampus", template: "%s · Chiketto" },
  description: "Beli tiket event kampus, simpan e-tiket QR, masuk dengan sekali pindai.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1c1f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${shippori.variable} ${zen.variable} ${dmMono.variable}`}>
      <head>
        {/* Hanya glyph "チケット" untuk wordmark, agar file font tetap ringan. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400&text=%E3%83%81%E3%82%B1%E3%83%83%E3%83%88&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
