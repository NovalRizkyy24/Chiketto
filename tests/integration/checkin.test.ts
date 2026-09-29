import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/queue", () => ({ enqueue: vi.fn(), queue: vi.fn() }));

import { checkIn } from "@/lib/checkin";
import { db } from "@/lib/db";
import { createOrder } from "@/lib/orders/create-order";
import { createQrToken } from "@/lib/qr-token";
import { makeEvent, makeUsers, truncateAll } from "./fixtures";

beforeEach(truncateAll);
afterAll(() => db.$disconnect());

async function freeTicket() {
  const ctx = await makeEvent({ quota: 10, price: 0 });
  const [buyer, crewA, crewB] = await makeUsers(3);
  const order = await createOrder(buyer.id, { eventId: ctx.event.id, items: [{ ticketTypeId: ctx.ticketType.id, qty: 1 }] });
  const ticket = await db.ticket.findFirstOrThrow({ where: { orderId: order.id } });
  return { ...ctx, ticket, crewA, crewB };
}

describe("check-in", () => {
  it("dua panitia memindai tiket yang sama bersamaan → hanya satu VALID", async () => {
    const { event, ticket, crewA, crewB } = await freeTicket();
    const token = createQrToken(ticket.id);

    const results = await Promise.all([
      checkIn({ token, eventId: event.id, crewUserId: crewA.id }),
      checkIn({ token, eventId: event.id, crewUserId: crewB.id }),
    ]);

    expect(results.map((r) => r.verdict).sort()).toEqual(["SUDAH_DIPAKAI", "VALID"]);
    const t = await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(t.status).toBe("CHECKED_IN");
  });

  it("pindai ulang menampilkan jam & nama panitia pertama", async () => {
    const { event, ticket, crewA, crewB } = await freeTicket();
    await checkIn({ code: ticket.code, eventId: event.id, crewUserId: crewA.id });
    const again = await checkIn({ code: ticket.code.toLowerCase(), eventId: event.id, crewUserId: crewB.id });
    expect(again.verdict).toBe("SUDAH_DIPAKAI");
    expect(again).toMatchObject({ checkedInByName: crewA.name });
  });

  it("tiket event lain → BUKAN_EVENT_INI", async () => {
    const { ticket, crewA } = await freeTicket();
    const other = await makeEvent({ quota: 5, price: 0 });
    const r = await checkIn({ token: createQrToken(ticket.id), eventId: other.event.id, crewUserId: crewA.id });
    expect(r.verdict).toBe("BUKAN_EVENT_INI");
  });

  it("QR palsu atau kode asal → TIDAK_DITEMUKAN", async () => {
    const { event, ticket, crewA } = await freeTicket();
    const forged = `${Buffer.from(ticket.id).toString("base64url")}.AAAA`;
    expect((await checkIn({ token: forged, eventId: event.id, crewUserId: crewA.id })).verdict).toBe("TIDAK_DITEMUKAN");
    expect((await checkIn({ code: "ZZZ-ZZZ", eventId: event.id, crewUserId: crewA.id })).verdict).toBe("TIDAK_DITEMUKAN");
  });

  it("tiket VOID tidak bisa masuk", async () => {
    const { event, ticket, crewA } = await freeTicket();
    await db.ticket.update({ where: { id: ticket.id }, data: { status: "VOID" } });
    const r = await checkIn({ token: createQrToken(ticket.id), eventId: event.id, crewUserId: crewA.id });
    expect(r.verdict).toBe("TIDAK_DITEMUKAN");
  });
});
