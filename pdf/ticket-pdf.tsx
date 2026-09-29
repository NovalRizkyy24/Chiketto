import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatDateLong } from "@/lib/format-date";
import { formatRupiah } from "@/lib/format-rupiah";
import { createQrToken } from "@/lib/qr-token";
import { qrPng, type TicketWithRelations } from "@/lib/tickets";

// Padanan hex token warna (PDF tidak mendukung OKLCH).
const C = { paper: "#f6f3ec", paper2: "#ece9e2", ink: "#1c1f25", ink3: "#6f7278", shu: "#bb4a2c" };

const s = StyleSheet.create({
  page: { backgroundColor: C.paper, padding: 28, fontFamily: "Helvetica", color: C.ink },
  ticket: { flexDirection: "row", borderWidth: 1, borderColor: C.ink, borderStyle: "solid" },
  info: { flexGrow: 1, flexBasis: 0, padding: 20, gap: 6 },
  stub: {
    width: 190,
    padding: 16,
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: C.ink,
    borderLeftStyle: "dashed",
  },
  title: { fontFamily: "Times-Bold", fontSize: 18, marginBottom: 8 },
  line: { fontSize: 10, lineHeight: 1.6 },
  muted: { fontSize: 9, color: C.ink3 },
  accent: { fontSize: 11, color: C.shu, marginTop: 10 },
  code: { fontFamily: "Courier-Bold", fontSize: 13, marginTop: 8, letterSpacing: 1 },
  qrBox: { backgroundColor: C.paper2, padding: 6 },
  void: { fontSize: 12, color: C.ink3, marginBottom: 6 },
});

async function TicketPage({ t }: { t: TicketWithRelations }) {
  const tz = t.event.org.campus.timezone;
  const png = t.status === "VOID" ? null : await qrPng(createQrToken(t.id), 360);
  return (
    <Page size={[595, 280]} style={s.page} key={t.id}>
      <View style={s.ticket}>
        <View style={s.info}>
          {t.status === "VOID" ? <Text style={s.void}>Tiket dibatalkan</Text> : null}
          <Text style={s.title}>{t.event.title}</Text>
          <Text style={s.line}>{formatDateLong(t.event.startsAt, tz)}</Text>
          <Text style={s.line}>{t.event.venue}</Text>
          <Text style={s.muted}>{t.event.org.name}</Text>
          <Text style={s.accent}>
            {t.ticketType.name} · {formatRupiah(t.ticketType.price)}
          </Text>
          <Text style={s.line}>{t.holderName}</Text>
          <Text style={s.muted}>Pesanan {t.order.code}</Text>
        </View>
        <View style={s.stub}>
          {png ? (
            <View style={s.qrBox}>
              <Image src={{ data: png, format: "png" }} style={{ width: 140, height: 140 }} />
            </View>
          ) : null}
          <Text style={s.code}>{t.code}</Text>
          <Text style={[s.muted, { marginTop: 6, textAlign: "center" }]}>Naikkan kecerahan layar saat dipindai.</Text>
        </View>
      </View>
    </Page>
  );
}

export async function renderTicketsPdf(tickets: TicketWithRelations[]): Promise<Buffer> {
  const pages = await Promise.all(tickets.map((t) => TicketPage({ t })));
  return renderToBuffer(
    <Document title={`E-tiket ${tickets[0]?.event.title ?? ""}`} author="Chiketto">
      {pages}
    </Document>,
  );
}
