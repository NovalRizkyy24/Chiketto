// Muat .env saat dijalankan lokal; di server produksi variabel sudah diset oleh platform.
try {
  process.loadEnvFile();
} catch {}
