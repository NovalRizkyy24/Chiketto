import { expect, test, type Page } from "@playwright/test";

// Butuh database yang sudah di-seed (npm run db:seed) dan DEMO_LOGIN=true, PAYMENT_MOCK=true.

async function loginAs(page: Page, label: "pembeli" | "penyelenggara" | "panitia", callbackUrl = "/") {
  await page.goto(`/masuk?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByRole("button", { name: `Masuk sebagai ${label}` }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/masuk"));
}

test("beranda menampilkan papan jadwal tanpa scroll horizontal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Malam Akustik Dies Natalis/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("beli tiket gratis sampai tiket terbit", async ({ page }) => {
  await loginAs(page, "pembeli", "/events/seminar-karier-masuk-dunia-it");
  await page.getByRole("button", { name: "Tambah Peserta" }).click();
  await page.getByRole("button", { name: "Beli tiket" }).click();
  await expect(page.getByText("Tiket kamu sudah terbit.")).toBeVisible();
  await page.getByRole("link", { name: "Lihat tiket" }).click();
  await expect(page.getByRole("article", { name: /Seminar Karier/ })).toBeVisible();
});

test("beli tiket berbayar dengan simulasi pembayaran", async ({ page }) => {
  await loginAs(page, "pembeli", "/events/lomba-desain-poster-tingkat-kampus");
  await page.getByRole("button", { name: "Tambah Pendaftaran" }).click();
  await page.getByRole("button", { name: "Beli tiket" }).click();
  await expect(page.getByText(/Tiket ditahan/)).toBeVisible();
  await page.getByRole("button", { name: /^Bayar Rp/ }).click();
  await expect(page.getByText(/Pembayaran diterima/)).toBeVisible({ timeout: 15_000 });
});

test("panitia memasukkan kode manual", async ({ page }) => {
  await loginAs(page, "panitia", "/scan");
  await page.getByRole("link", { name: /Malam Akustik/ }).click();
  await page.getByRole("button", { name: "Ketik kode manual" }).click();
  await page.getByLabel(/Kode di bawah QR/).fill("ZZZ-ZZZ");
  await page.getByRole("button", { name: "Periksa tiket" }).click();
  await expect(page.getByText("TIDAK DIKENAL")).toBeVisible();
});

test("penyelenggara membuat event draft", async ({ page }) => {
  await loginAs(page, "penyelenggara", "/dashboard/hima-si/events/baru");
  await page.getByLabel("Judul event").fill(`Workshop E2E ${Date.now()}`);
  await page.getByLabel("Tempat").fill("Lab 1");
  await page.getByLabel("Mulai (WIB)").fill("2030-01-10T09:00");
  await page.getByLabel("Selesai (WIB)").fill("2030-01-10T12:00");
  await page.getByLabel("Deskripsi", { exact: true }).fill("Workshop singkat untuk pengujian end-to-end aplikasi.");
  await page.getByRole("button", { name: "Simpan draft" }).click();
  await expect(page.getByRole("button", { name: "Terbitkan event" })).toBeVisible();
});
