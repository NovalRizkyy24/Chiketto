import type { EventCategory, Prisma, TicketType } from "@prisma/client";
import { z } from "zod";
import { db, TX_OPTIONS } from "./db";
import { audit } from "./audit";
import { randomSuffix, slugify } from "./codes";
import { AppError, NotFoundError } from "./errors";
import { DEFAULT_TZ, fromDatetimeLocal, localDateKey } from "./format-date";
import { releaseOrder } from "./orders/release-order";

export const CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: "KONSER", label: "Konser" },
  { value: "SEMINAR", label: "Seminar" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "LOMBA", label: "Lomba" },
  { value: "LAINNYA", label: "Lainnya" },
];

export const categoryLabel = (c: EventCategory) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

/* ───────────── Publik ───────────── */

export type Availability = "tersedia" | "sisa-sedikit" | "habis";

/** "Sisa sedikit" bila sisa ≤ 20% kuota. */
export function availabilityOf(types: Pick<TicketType, "quota" | "sold" | "reserved">[]): {
  status: Availability;
  remaining: number;
  quota: number;
} {
  const quota = types.reduce((s, t) => s + t.quota, 0);
  const remaining = types.reduce((s, t) => s + Math.max(0, t.quota - t.sold - t.reserved), 0);
  if (quota === 0 || remaining === 0) return { status: "habis", remaining: 0, quota };
  if (remaining <= quota * 0.2) return { status: "sisa-sedikit", remaining, quota };
  return { status: "tersedia", remaining, quota };
}

export const listQuerySchema = z.object({
  kategori: z.enum(["KONSER", "SEMINAR", "WORKSHOP", "LOMBA", "LAINNYA"]).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(100).default(1).catch(1),
});

export async function listPublicEvents(params: z.infer<typeof listQuerySchema>, pageSize = 30) {
  const where: Prisma.EventWhereInput = {
    status: "PUBLISHED",
    endsAt: { gte: new Date() },
    ...(params.kategori ? { category: params.kategori } : {}),
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q, mode: "insensitive" } },
            { venue: { contains: params.q, mode: "insensitive" } },
            { org: { name: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [events, total] = await Promise.all([
    db.event.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip: (params.page - 1) * pageSize,
      take: pageSize,
      include: { org: { include: { campus: true } }, ticketTypes: true },
    }),
    db.event.count({ where }),
  ]);
  return { events, total, page: params.page, pageSize };
}

export async function getPublicEvent(slug: string) {
  const event = await db.event.findUnique({
    where: { slug },
    include: {
      org: { include: { campus: true } },
      ticketTypes: { orderBy: [{ sortOrder: "asc" }, { price: "asc" }] },
    },
  });
  if (!event || event.status === "DRAFT") return null;
  return event;
}

/* ───────────── Penyelenggara ───────────── */

const dt = z.string().min(1, "Tanggal wajib diisi.");

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(4, "Judul minimal 4 karakter.").max(120),
    category: z.enum(["KONSER", "SEMINAR", "WORKSHOP", "LOMBA", "LAINNYA"]),
    description: z.string().trim().min(20, "Deskripsi minimal 20 karakter.").max(5000),
    venue: z.string().trim().min(2, "Tempat wajib diisi.").max(120),
    startsAt: dt,
    endsAt: dt,
    maxPerUser: z.coerce.number().int().min(1, "Minimal 1 tiket per akun.").max(20, "Maksimal 20 tiket per akun."),
    posterUrl: z
      .string()
      .max(500)
      .regex(/^(https:\/\/|\/api\/uploads\/)/, "Alamat poster tidak valid.")
      .optional()
      .or(z.literal("")),
    posterAlt: z.string().trim().max(300).optional(),
  })
  .transform((v, ctx) => {
    const startsAt = fromDatetimeLocal(v.startsAt, DEFAULT_TZ);
    const endsAt = fromDatetimeLocal(v.endsAt, DEFAULT_TZ);
    if (endsAt <= startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Waktu selesai harus setelah waktu mulai." });
      return z.NEVER;
    }
    return { ...v, startsAt, endsAt, posterUrl: v.posterUrl || null, posterAlt: v.posterAlt || null };
  });

export type EventInput = z.input<typeof eventInputSchema>;

export async function createEvent(orgId: string, actorId: string, input: unknown) {
  const data = eventInputSchema.parse(input);
  const event = await db.event.create({
    data: { ...data, orgId, slug: `${slugify(data.title)}-${randomSuffix()}` },
  });
  await audit("event.create", event.id, { actorId });
  return event;
}

export async function updateEvent(eventId: string, actorId: string, input: unknown) {
  const data = eventInputSchema.parse(input);
  const event = await db.event.update({ where: { id: eventId }, data });
  await audit("event.update", event.id, { actorId });
  return event;
}

export async function publishEvent(eventId: string, actorId: string) {
  const event = await db.event.findUniqueOrThrow({
    where: { id: eventId },
    include: { org: true, ticketTypes: true },
  });
  if (event.status !== "DRAFT") throw new AppError("Hanya event draft yang bisa diterbitkan.", 409);
  if (!event.org.verifiedAt) {
    throw new AppError("Organisasi kamu belum diverifikasi admin, jadi event belum bisa diterbitkan.", 409);
  }
  if (event.ticketTypes.length === 0) throw new AppError("Tambahkan minimal satu jenis tiket sebelum menerbitkan.");
  if (event.endsAt < new Date()) throw new AppError("Waktu event sudah lewat. Ubah tanggalnya dulu.");
  const updated = await db.event.update({ where: { id: eventId }, data: { status: "PUBLISHED" } });
  await audit("event.publish", eventId, { actorId });
  return updated;
}

/** Batalkan event: tiket jadi VOID, order menunggu bayar dibatalkan. Refund dicatat manual. */
export async function cancelEvent(eventId: string, actorId: string) {
  await db.$transaction(async (tx) => {
    const updated = await tx.event.updateMany({
      where: { id: eventId, status: { in: ["DRAFT", "PUBLISHED"] } },
      data: { status: "CANCELLED" },
    });
    if (updated.count === 0) throw new AppError("Event ini sudah tidak aktif.", 409);
    const pending = await tx.order.findMany({ where: { eventId, status: "PENDING" }, select: { id: true } });
    for (const o of pending) await releaseOrder(tx, o.id, "CANCELLED", actorId);
    await tx.ticket.updateMany({ where: { eventId, status: "ACTIVE" }, data: { status: "VOID" } });
    await audit("event.cancel", eventId, { client: tx, actorId });
  }, TX_OPTIONS);
}

export const ticketTypeInputSchema = z
  .object({
    name: z.string().trim().min(2, "Nama jenis tiket wajib diisi.").max(40),
    description: z.string().trim().max(120).optional(),
    price: z.coerce.number().int().min(0, "Harga tidak boleh negatif.").max(100_000_000),
    quota: z.coerce.number().int().min(1, "Kuota minimal 1.").max(100_000),
    studentOnly: z.coerce.boolean().default(false),
    salesStart: dt,
    salesEnd: dt,
  })
  .transform((v, ctx) => {
    const salesStart = fromDatetimeLocal(v.salesStart, DEFAULT_TZ);
    const salesEnd = fromDatetimeLocal(v.salesEnd, DEFAULT_TZ);
    if (salesEnd <= salesStart) {
      ctx.addIssue({ code: "custom", path: ["salesEnd"], message: "Akhir penjualan harus setelah awal penjualan." });
      return z.NEVER;
    }
    return { ...v, description: v.description || null, salesStart, salesEnd };
  });

export type TicketTypeInput = z.input<typeof ticketTypeInputSchema>;

export async function saveTicketType(eventId: string, actorId: string, input: unknown, ticketTypeId?: string) {
  const data = ticketTypeInputSchema.parse(input);
  if (!ticketTypeId) {
    const count = await db.ticketType.count({ where: { eventId } });
    const tt = await db.ticketType.create({ data: { ...data, eventId, sortOrder: count } });
    await audit("ticket_type.create", tt.id, { actorId });
    return tt;
  }
  const existing = await db.ticketType.findUnique({ where: { id: ticketTypeId } });
  if (!existing || existing.eventId !== eventId) throw new NotFoundError("Jenis tiket");
  if (data.quota < existing.sold + existing.reserved) {
    throw new AppError(
      `Kuota tidak bisa di bawah ${existing.sold + existing.reserved} karena tiket sudah terjual atau sedang ditahan.`,
    );
  }
  if (existing.sold > 0 && data.price !== existing.price) {
    throw new AppError("Harga tidak bisa diubah setelah ada tiket terjual. Buat jenis tiket baru.");
  }
  const tt = await db.ticketType.update({ where: { id: ticketTypeId }, data });
  await audit("ticket_type.update", tt.id, { actorId });
  return tt;
}

export async function deleteTicketType(eventId: string, actorId: string, ticketTypeId: string) {
  const existing = await db.ticketType.findUnique({
    where: { id: ticketTypeId },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!existing || existing.eventId !== eventId) throw new NotFoundError("Jenis tiket");
  if (existing._count.orderItems > 0) {
    throw new AppError("Jenis tiket yang sudah pernah dipesan tidak bisa dihapus.", 409);
  }
  await db.ticketType.delete({ where: { id: ticketTypeId } });
  await audit("ticket_type.delete", ticketTypeId, { actorId });
  return existing;
}

/** Kembalikan jenis tiket yang dihapus (tombol "Batalkan" pada snackbar). */
const restoreSchema = z.object({
  name: z.string().min(1).max(40),
  description: z.string().max(120).nullable(),
  price: z.number().int().min(0),
  quota: z.number().int().min(1),
  studentOnly: z.boolean(),
  salesStart: z.coerce.date(),
  salesEnd: z.coerce.date(),
  sortOrder: z.number().int(),
});

export async function restoreTicketType(eventId: string, actorId: string, snapshot: unknown) {
  const data = restoreSchema.parse(snapshot);
  const tt = await db.ticketType.create({ data: { ...data, eventId } });
  await audit("ticket_type.restore", tt.id, { actorId });
  return tt;
}

/* ───────────── Statistik ───────────── */

/** Deret harian tanpa lubang: hari tanpa penjualan tetap tampil sebagai 0. */
function fillDays(daily: Map<string, number>) {
  const keys = [...daily.keys()].sort();
  if (keys.length === 0) return [];
  const out: { date: string; qty: number }[] = [];
  const end = new Date(`${keys[keys.length - 1]}T00:00:00Z`);
  for (let d = new Date(`${keys[0]}T00:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, qty: daily.get(key) ?? 0 });
  }
  return out;
}

export async function eventStats(eventId: string) {
  const [event, revenue, checkedIn, paidOrders] = await Promise.all([
    db.event.findUniqueOrThrow({
      where: { id: eventId },
      include: { ticketTypes: { orderBy: [{ sortOrder: "asc" }, { price: "asc" }] } },
    }),
    db.order.aggregate({ _sum: { total: true }, where: { eventId, status: "PAID" } }),
    db.ticket.count({ where: { eventId, status: "CHECKED_IN" } }),
    db.order.findMany({
      where: { eventId, status: "PAID" },
      select: { paidAt: true, items: { select: { qty: true } } },
    }),
  ]);

  const sold = event.ticketTypes.reduce((s, t) => s + t.sold, 0);
  const quota = event.ticketTypes.reduce((s, t) => s + t.quota, 0);

  const daily = new Map<string, number>();
  for (const o of paidOrders) {
    if (!o.paidAt) continue;
    const key = localDateKey(o.paidAt);
    daily.set(key, (daily.get(key) ?? 0) + o.items.reduce((s, i) => s + i.qty, 0));
  }

  return {
    event,
    sold,
    quota,
    grossRevenue: revenue._sum.total ?? 0,
    checkedIn,
    ticketTypes: event.ticketTypes.map((t) => ({
      id: t.id,
      name: t.name,
      price: t.price,
      quota: t.quota,
      sold: t.sold,
      reserved: t.reserved,
      remaining: t.quota - t.sold - t.reserved,
    })),
    dailySales: fillDays(daily),
  };
}

export const attendeeQuerySchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  status: z.enum(["ACTIVE", "CHECKED_IN", "VOID"]).optional().catch(undefined),
});

export async function listAttendees(eventId: string, query: z.infer<typeof attendeeQuerySchema>) {
  return db.ticket.findMany({
    where: {
      eventId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { holderName: { contains: query.q, mode: "insensitive" } },
              { code: { contains: query.q.toUpperCase() } },
              { owner: { email: { contains: query.q, mode: "insensitive" } } },
              { order: { code: { contains: query.q.toUpperCase() } } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "asc" }],
    include: { ticketType: true, owner: true, order: true },
    take: 2000,
  });
}
