/**
 * Data demo Chiketto. Semua angka penjualan berasal dari order & tiket yang benar-benar dibuat di sini.
 * Tanggal dibuat relatif terhadap hari ini supaya demo selalu punya event mendatang.
 * PERINGATAN: menghapus seluruh data yang ada.
 */
import { PrismaClient, type EventCategory } from "@prisma/client";
import { generateOrderCode, generateTicketCode } from "../lib/codes";

const db = new PrismaClient();
const CAMPUS_DOMAIN = process.env.STUDENT_EMAIL_DOMAIN ?? "student.kampus.ac.id";

/** Tanggal `offsetDays` dari hari ini, pukul `hour`:`minute` WIB. */
function wib(offsetDays: number, hour: number, minute = 0) {
  const now = new Date();
  const jakarta = new Date(now.getTime() + 7 * 3600_000);
  const d = new Date(Date.UTC(jakarta.getUTCFullYear(), jakarta.getUTCMonth(), jakarta.getUTCDate() + offsetDays, hour - 7, minute));
  return d;
}

const BUYER_NAMES = [
  "Aulia Rahmah", "Bima Saputra", "Citra Lestari", "Dimas Prakoso", "Eka Wulandari", "Fajar Nugroho",
  "Gita Permata", "Hafiz Maulana", "Intan Sari", "Joko Susanto", "Kirana Dewi", "Lutfi Hakim",
  "Mega Anggraini", "Naufal Akbar", "Oktavia Putri", "Pandu Wicaksono", "Qori Amalia", "Reza Firmansyah",
  "Salsabila Nur", "Taufik Hidayat", "Umi Kalsum", "Vina Maharani", "Wahyu Setiawan", "Yoga Pratama",
  "Zahra Aisyah", "Arif Budiman", "Bella Safitri", "Cahyo Utomo", "Dewi Kartika", "Erlangga Putra",
];

async function reset() {
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.payment.deleteMany(),
    db.ticket.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.ticketType.deleteMany(),
    db.eventCrew.deleteMany(),
    db.event.deleteMany(),
    db.membership.deleteMany(),
    db.organization.deleteMany(),
    db.studentVerification.deleteMany(),
    db.account.deleteMany(),
    db.session.deleteMany(),
    db.verificationToken.deleteMany(),
    db.user.deleteMany(),
    db.campus.deleteMany(),
  ]);
}

const usedTicketCodes = new Set<string>();
function ticketCode() {
  let c: string;
  do c = generateTicketCode();
  while (usedTicketCodes.has(c));
  usedTicketCodes.add(c);
  return c;
}

/** Order lunas lengkap dengan tiket, dan `sold` ikut bertambah. */
async function paidOrder(opts: {
  userId: string;
  holderName: string;
  eventId: string;
  ticketTypeId: string;
  price: number;
  qty: number;
  paidAt: Date;
  checkedIn?: { at: Date; by: string };
}) {
  const order = await db.order.create({
    data: {
      code: generateOrderCode(),
      userId: opts.userId,
      eventId: opts.eventId,
      status: "PAID",
      total: opts.price * opts.qty,
      expiresAt: new Date(opts.paidAt.getTime() + 15 * 60_000),
      paidAt: opts.paidAt,
      createdAt: new Date(opts.paidAt.getTime() - 3 * 60_000),
      items: { create: { ticketTypeId: opts.ticketTypeId, qty: opts.qty, unitPrice: opts.price } },
    },
  });
  if (opts.price > 0) {
    await db.payment.create({
      data: {
        orderId: order.id,
        gatewayRef: `SEED-${order.code}`,
        method: "qris",
        status: "settlement",
        rawPayload: { seeded: true },
        receivedAt: opts.paidAt,
      },
    });
  }
  for (let i = 0; i < opts.qty; i++) {
    await db.ticket.create({
      data: {
        code: ticketCode(),
        orderId: order.id,
        ticketTypeId: opts.ticketTypeId,
        eventId: opts.eventId,
        ownerId: opts.userId,
        holderName: opts.holderName,
        status: opts.checkedIn ? "CHECKED_IN" : "ACTIVE",
        checkedInAt: opts.checkedIn?.at,
        checkedInBy: opts.checkedIn?.by,
        createdAt: opts.paidAt,
      },
    });
  }
  await db.ticketType.update({ where: { id: opts.ticketTypeId }, data: { sold: { increment: opts.qty } } });
  return order;
}

async function main() {
  await reset();

  const campus = await db.campus.create({
    data: { name: "Universitas Contoh", emailDomain: CAMPUS_DOMAIN, timezone: "Asia/Jakarta" },
  });

  const [buyer, organizer, crew, admin] = await Promise.all([
    db.user.create({
      data: {
        name: "Nadia Putri",
        email: "pembeli@demo.chiketto.id",
        emailVerified: new Date(),
        campusId: campus.id,
        studentEmail: `nadia.putri@${CAMPUS_DOMAIN}`,
        studentVerifiedAt: new Date(),
      },
    }),
    db.user.create({ data: { name: "Raka Pratama", email: "penyelenggara@demo.chiketto.id", emailVerified: new Date(), campusId: campus.id } }),
    db.user.create({ data: { name: "Rafi Hidayat", email: "panitia@demo.chiketto.id", emailVerified: new Date(), campusId: campus.id } }),
    db.user.create({ data: { name: "Admin Chiketto", email: "admin@demo.chiketto.id", emailVerified: new Date(), isPlatformAdmin: true } }),
  ]);

  const buyers = await Promise.all(
    BUYER_NAMES.map((name, i) =>
      db.user.create({
        data: {
          name,
          email: `${name.toLowerCase().replace(/\s+/g, ".")}@${CAMPUS_DOMAIN}`,
          campusId: campus.id,
          studentEmail: `${name.toLowerCase().replace(/\s+/g, ".")}.${i}@${CAMPUS_DOMAIN}`,
          studentVerifiedAt: new Date(),
        },
      }),
    ),
  );

  const org = (name: string, slug: string, verified = true) =>
    db.organization.create({ data: { name, slug, campusId: campus.id, verifiedAt: verified ? new Date() : null } });
  const himaSI = await org("HIMA Sistem Informasi", "hima-si");
  const bem = await org("BEM Fakultas Teknik", "bem-ft");
  const seniRupa = await org("UKM Seni Rupa", "ukm-seni-rupa");
  await org("UKM Fotografi", "ukm-fotografi", false);

  await db.membership.createMany({
    data: [
      { userId: organizer.id, orgId: himaSI.id, role: "ORGANIZER" },
      { userId: organizer.id, orgId: bem.id, role: "ORGANIZER" },
      { userId: organizer.id, orgId: seniRupa.id, role: "ORGANIZER" },
      { userId: crew.id, orgId: himaSI.id, role: "CREW" },
    ],
  });

  type TT = { name: string; price: number; quota: number; studentOnly?: boolean; description?: string; salesEndOffset?: number };
  async function event(e: {
    orgId: string;
    slug: string;
    title: string;
    category: EventCategory;
    venue: string;
    day: number;
    hour: number;
    durationH: number;
    description: string;
    status?: "DRAFT" | "PUBLISHED";
    maxPerUser?: number;
    types: TT[];
  }) {
    const startsAt = wib(e.day, e.hour);
    return db.event.create({
      data: {
        orgId: e.orgId,
        slug: e.slug,
        title: e.title,
        category: e.category,
        venue: e.venue,
        description: e.description,
        startsAt,
        endsAt: new Date(startsAt.getTime() + e.durationH * 3600_000),
        status: e.status ?? "PUBLISHED",
        maxPerUser: e.maxPerUser ?? 4,
        ticketTypes: {
          create: e.types.map((t, i) => ({
            name: t.name,
            description: t.description,
            price: t.price,
            quota: t.quota,
            studentOnly: t.studentOnly ?? false,
            salesStart: wib(Math.min(-30, e.day - 40), 8),
            salesEnd: t.salesEndOffset !== undefined ? wib(t.salesEndOffset, 23, 59) : startsAt,
            sortOrder: i,
          })),
        },
      },
      include: { ticketTypes: { orderBy: { sortOrder: "asc" } } },
    });
  }

  const akustik = await event({
    orgId: himaSI.id,
    slug: "malam-akustik-dies-natalis",
    title: "Malam Akustik Dies Natalis",
    category: "KONSER",
    venue: "Aula Utama",
    day: 13,
    hour: 19,
    durationH: 3,
    description:
      "Perayaan dies natalis Program Studi Sistem Informasi dengan malam akustik: band mahasiswa, alumni, dan satu bintang tamu.\n\nPintu dibuka pukul 18.30. Tunjukkan e-tiket QR di pintu masuk. Satu tiket untuk satu orang.",
    types: [
      { name: "Presale", price: 35_000, quota: 30, studentOnly: true, salesEndOffset: 6 },
      { name: "Regular", price: 50_000, quota: 120 },
    ],
  });

  const seminar = await event({
    orgId: bem.id,
    slug: "seminar-karier-masuk-dunia-it",
    title: "Seminar Karier: Masuk Dunia IT",
    category: "SEMINAR",
    venue: "Gedung Serbaguna",
    day: 19,
    hour: 9,
    durationH: 4,
    maxPerUser: 1,
    description:
      "Tiga praktisi berbagi cara menyusun portofolio, melewati tes teknis, dan memilih jalur karier pertama di industri teknologi. Ada sesi tanya jawab dan review CV singkat.",
    types: [{ name: "Peserta", price: 0, quota: 200 }],
  });

  const lomba = await event({
    orgId: seniRupa.id,
    slug: "lomba-desain-poster-tingkat-kampus",
    title: "Lomba Desain Poster Tingkat Kampus",
    category: "LOMBA",
    venue: "Daring",
    day: 26,
    hour: 13,
    durationH: 5,
    maxPerUser: 1,
    description:
      "Tema tahun ini: ruang publik kampus. Karya dikumpulkan paling lambat H-3, final dan pengumuman pemenang dilakukan daring.",
    types: [{ name: "Pendaftaran", price: 20_000, quota: 50 }],
  });

  const konser = await event({
    orgId: bem.id,
    slug: "konser-kampus-suara-senja",
    title: "Konser Kampus: Suara Senja",
    category: "KONSER",
    venue: "Lapangan Rektorat",
    day: 33,
    hour: 18,
    durationH: 4,
    description: "Konser penutup rangkaian pekan budaya fakultas.",
    types: [{ name: "Festival", price: 75_000, quota: 20 }],
  });

  await event({
    orgId: himaSI.id,
    slug: "workshop-fotografi-ponsel",
    title: "Workshop Fotografi Ponsel",
    category: "WORKSHOP",
    venue: "Lab Komputer 2",
    day: 40,
    hour: 13,
    durationH: 3,
    description: "Belajar komposisi, cahaya, dan menyunting foto hanya dengan ponsel. Bawa ponsel masing-masing.",
    types: [{ name: "Peserta", price: 25_000, quota: 30 }],
  });

  await event({
    orgId: himaSI.id,
    slug: "sharing-session-alumni-draft",
    title: "Sharing Session Alumni",
    category: "SEMINAR",
    venue: "Ruang Seminar Lt. 3",
    day: 50,
    hour: 15,
    durationH: 2,
    status: "DRAFT",
    description: "Alumni Sistem Informasi bercerita tentang tahun pertama bekerja.",
    types: [],
  });

  // Event yang sudah lewat: tiket pembeli demo sudah check-in (menampilkan stempel hanko).
  const pensi = await event({
    orgId: himaSI.id,
    slug: "pentas-seni-mahasiswa-baru",
    title: "Pentas Seni Mahasiswa Baru",
    category: "KONSER",
    venue: "Aula Utama",
    day: -20,
    hour: 19,
    durationH: 3,
    description: "Pentas seni penyambutan mahasiswa baru.",
    types: [{ name: "Regular", price: 30_000, quota: 80 }],
  });
  await db.event.update({ where: { id: pensi.id }, data: { status: "ENDED" } });

  await db.eventCrew.createMany({
    data: [
      { eventId: akustik.id, userId: crew.id },
      { eventId: pensi.id, userId: crew.id },
    ],
  });

  // ── Penjualan ──
  const [presale, regular] = akustik.ticketTypes;
  // Presale 26/30 → "Sisa sedikit"
  for (let i = 0; i < 13; i++) {
    const b = buyers[i];
    await paidOrder({ userId: b.id, holderName: b.name!, eventId: akustik.id, ticketTypeId: presale.id, price: presale.price, qty: 2, paidAt: wib(-14 + (i % 9), 10 + (i % 8), i * 4) });
  }
  for (let i = 13; i < 30; i++) {
    const b = buyers[i];
    await paidOrder({ userId: b.id, holderName: b.name!, eventId: akustik.id, ticketTypeId: regular.id, price: regular.price, qty: 1 + (i % 2), paidAt: wib(-6 + (i % 6), 9 + (i % 10)) });
  }
  await paidOrder({ userId: buyer.id, holderName: buyer.name!, eventId: akustik.id, ticketTypeId: presale.id, price: presale.price, qty: 1, paidAt: wib(-3, 20, 15) });

  for (let i = 0; i < 24; i++) {
    const b = buyers[i];
    await paidOrder({ userId: b.id, holderName: b.name!, eventId: seminar.id, ticketTypeId: seminar.ticketTypes[0].id, price: 0, qty: 1, paidAt: wib(-5 + (i % 5), 8 + (i % 12)) });
  }
  for (let i = 0; i < 9; i++) {
    const b = buyers[29 - i];
    await paidOrder({ userId: b.id, holderName: b.name!, eventId: lomba.id, ticketTypeId: lomba.ticketTypes[0].id, price: lomba.ticketTypes[0].price, qty: 1, paidAt: wib(-4 + (i % 4), 11 + i) });
  }
  // Konser: habis
  for (let i = 0; i < 10; i++) {
    const b = buyers[i + 5];
    await paidOrder({ userId: b.id, holderName: b.name!, eventId: konser.id, ticketTypeId: konser.ticketTypes[0].id, price: 75_000, qty: 2, paidAt: wib(-10 + i, 12) });
  }

  // Pentas seni (lampau): sebagian peserta sudah check-in
  for (let i = 0; i < 18; i++) {
    const b = buyers[i];
    const at = wib(-20, 19, 2 + i * 2);
    await paidOrder({
      userId: b.id,
      holderName: b.name!,
      eventId: pensi.id,
      ticketTypeId: pensi.ticketTypes[0].id,
      price: 30_000,
      qty: 1,
      paidAt: wib(-28 + (i % 7), 10),
      checkedIn: i < 15 ? { at, by: crew.id } : undefined,
    });
  }
  await paidOrder({
    userId: buyer.id,
    holderName: buyer.name!,
    eventId: pensi.id,
    ticketTypeId: pensi.ticketTypes[0].id,
    price: 30_000,
    qty: 1,
    paidAt: wib(-25, 21),
    checkedIn: { at: wib(-20, 19, 12), by: crew.id },
  });

  console.log("Seed selesai.");
  console.log("Akun demo: pembeli@, penyelenggara@, panitia@, admin@demo.chiketto.id");
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
