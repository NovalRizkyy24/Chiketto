import { describe, expect, it } from "vitest";
import { formatRupiah, formatRupiahPlain } from "@/lib/format-rupiah";
import { formatBoardDate, formatDateLong, fromDatetimeLocal, toDatetimeLocal } from "@/lib/format-date";

describe("formatRupiah", () => {
  it("memakai titik sebagai pemisah ribuan", () => {
    expect(formatRupiah(35_000)).toBe("Rp 35.000");
    expect(formatRupiah(7_240_000)).toBe("Rp 7.240.000");
  });
  it("menulis nol sebagai Gratis, bukan Rp 0", () => {
    expect(formatRupiah(0)).toBe("Gratis");
    expect(formatRupiahPlain(0)).toBe("Rp 0");
  });
});

describe("format tanggal", () => {
  // 12 Oktober 2026 19.00 WIB = 12.00 UTC
  const d = new Date("2026-10-12T12:00:00Z");

  it("format lengkap dengan zona WIB", () => {
    expect(formatDateLong(d)).toBe("Senin, 12 Oktober 2026 · 19.00 WIB");
  });
  it("format papan jadwal", () => {
    expect(formatBoardDate(d)).toEqual({ day: "12", sub: "Okt · Sen" });
  });
  it("datetime-local bolak-balik di zona kampus", () => {
    expect(toDatetimeLocal(d)).toBe("2026-10-12T19:00");
    expect(fromDatetimeLocal("2026-10-12T19:00").toISOString()).toBe(d.toISOString());
  });
});
