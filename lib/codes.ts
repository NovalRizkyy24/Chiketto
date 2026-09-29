import { randomInt } from "node:crypto";

// Tanpa huruf/angka yang mirip: O/0, I/1.
export const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomChars(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/** `CHK-24A7Q9` */
export function generateOrderCode(): string {
  return `CHK-${randomChars(6)}`;
}

/** `K7M-2QX` */
export function generateTicketCode(): string {
  return `${randomChars(3)}-${randomChars(3)}`;
}

/** Normalisasi input manual panitia: `k7m 2qx` → `K7M-2QX`. */
export function normalizeTicketCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length !== 6) return input.trim().toUpperCase();
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function randomSuffix(n = 4): string {
  return randomChars(n).toLowerCase();
}
