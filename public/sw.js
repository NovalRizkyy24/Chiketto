// Service worker Chiketto: menyimpan salinan halaman Tiket Saya agar QR tetap bisa dibuka offline.
const CACHE = "chiketto-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Halaman Tiket Saya: jaringan dulu, cadangan dari cache.
  if (req.mode === "navigate" && url.pathname.startsWith("/tiket-saya")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Sudah keluar (dialihkan ke /masuk): hapus salinan tiket dari perangkat.
          if (res.redirected && new URL(res.url).pathname.startsWith("/masuk")) {
            caches.open(CACHE).then((c) => c.delete("/tiket-saya"));
          } else if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/tiket-saya", copy));
          }
          return res;
        })
        .catch(() => caches.match("/tiket-saya").then((r) => r || Response.error())),
    );
    return;
  }

  // Aset statis ber-hash: cache dulu.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
