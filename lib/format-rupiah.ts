const nf = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** `Rp 35.000`; nol ditulis `Gratis`. */
export function formatRupiah(amount: number): string {
  if (amount === 0) return "Gratis";
  return `Rp ${nf.format(amount)}`;
}

/** Selalu angka, tanpa kata "Gratis" (untuk tabel dashboard). */
export function formatRupiahPlain(amount: number): string {
  return `Rp ${nf.format(amount)}`;
}
