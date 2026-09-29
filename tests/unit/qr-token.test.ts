import { describe, expect, it } from "vitest";
import { createQrToken, verifyQrToken } from "@/lib/qr-token";
import { CODE_ALPHABET, generateOrderCode, generateTicketCode, normalizeTicketCode } from "@/lib/codes";

describe("token QR", () => {
  it("token sah menghasilkan ticketId", () => {
    expect(verifyQrToken(createQrToken("ckticket123"))).toBe("ckticket123");
  });

  it("menolak tanda tangan yang diubah", () => {
    const [id, sig] = createQrToken("ckticket123").split(".");
    const tampered = `${id}.${sig.slice(0, -2)}AA`;
    expect(verifyQrToken(tampered)).toBeNull();
  });

  it("menolak ID lain dengan tanda tangan tiket asli", () => {
    const [, sig] = createQrToken("ckticket123").split(".");
    const forged = `${Buffer.from("ckticket999").toString("base64url")}.${sig}`;
    expect(verifyQrToken(forged)).toBeNull();
  });

  it("menolak teks acak dan ID mentah", () => {
    expect(verifyQrToken("ckticket123")).toBeNull();
    expect(verifyQrToken("a.b.c")).toBeNull();
    expect(verifyQrToken("")).toBeNull();
  });
});

describe("kode", () => {
  it("kode order berformat CHK-XXXXXX tanpa O/0/I/1", () => {
    for (let i = 0; i < 200; i++) {
      const c = generateOrderCode();
      expect(c).toMatch(/^CHK-[2-9A-HJ-NP-Z]{6}$/);
    }
    expect(CODE_ALPHABET).not.toMatch(/[O0I1]/);
  });
  it("kode tiket berformat XXX-XXX", () => {
    expect(generateTicketCode()).toMatch(/^[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$/);
  });
  it("menormalkan input manual panitia", () => {
    expect(normalizeTicketCode("k7m 2qx")).toBe("K7M-2QX");
    expect(normalizeTicketCode("k7m-2qx")).toBe("K7M-2QX");
  });
});
