import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";

type Client = PrismaClient | Prisma.TransactionClient;

export async function audit(
  action: string,
  targetId: string,
  opts: { actorId?: string | null; meta?: Prisma.InputJsonValue; client?: Client } = {},
) {
  const client = opts.client ?? db;
  await client.auditLog.create({
    data: { action, targetId, actorId: opts.actorId ?? null, meta: opts.meta },
  });
}
