"use client";

import { useEffect, useState } from "react";

/** Daftarkan service worker agar halaman Tiket Saya (dan QR-nya) bisa dibuka tanpa internet. */
export function OfflineReady() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return offline ? (
    <p className="mt-3 text-sm text-ink-2" role="status">
      Kamu sedang offline. Tiket di bawah adalah salinan terakhir yang tersimpan di perangkat ini.
    </p>
  ) : null;
}
