import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Opsi transaksi untuk alur yang berebut kuota: beri waktu antre koneksi yang cukup.
export const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const;
