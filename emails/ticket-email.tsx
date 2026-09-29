import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";

// Padanan hex token warna (klien email tidak mendukung OKLCH).
const C = { paper: "#f6f3ec", paper2: "#ece9e2", ink: "#1c1f25", ink2: "#55585e", ink3: "#6f7278", rule: "#d9d6cf", shu: "#bb4a2c" };
const body = { fontFamily: "'Zen Kaku Gothic New', 'Hiragino Sans', Arial, sans-serif", color: C.ink };
const mono = { fontFamily: "'DM Mono', ui-monospace, Menlo, monospace" };

export type TicketEmailProps = {
  eventTitle: string;
  dateLine: string;
  venue: string;
  orderCode: string;
  ticketsUrl: string;
  tickets: { code: string; typeName: string; priceLabel: string; holderName: string; qrCid: string }[];
};

export function TicketEmail(p: TicketEmailProps) {
  return (
    <Html lang="id">
      <Head />
      <Preview>{`E-tiket ${p.eventTitle} · ${p.dateLine}`}</Preview>
      <Body style={{ ...body, backgroundColor: C.paper, margin: 0, padding: "32px 0" }}>
        <Container style={{ maxWidth: 520, padding: "0 20px" }}>
          <Text style={{ fontFamily: "'Shippori Mincho B1', 'Hiragino Mincho ProN', Georgia, serif", fontWeight: 700, fontSize: 22, margin: 0 }}>
            Chiketto
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 1.7, marginTop: 32 }}>
            Pembayaran diterima. Ini e-tiket kamu untuk <strong>{p.eventTitle}</strong>.
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 1.7, color: C.ink2, margin: 0 }}>
            {p.dateLine}
            <br />
            {p.venue}
          </Text>

          {p.tickets.map((t) => (
            <Section key={t.code} style={{ border: `1px solid ${C.ink}`, marginTop: 24, padding: 20 }}>
              <Text style={{ fontSize: 14, color: C.shu, margin: 0 }}>
                {t.typeName} · {t.priceLabel}
              </Text>
              <Text style={{ fontSize: 16, margin: "4px 0 16px" }}>{t.holderName}</Text>
              <Section style={{ backgroundColor: C.paper2, padding: 12, width: 224 }}>
                <Img src={`cid:${t.qrCid}`} width="200" height="200" alt={`QR tiket ${t.code}`} />
              </Section>
              <Text style={{ ...mono, fontSize: 18, letterSpacing: "0.08em", margin: "12px 0 0" }}>{t.code}</Text>
            </Section>
          ))}

          <Text style={{ fontSize: 14, lineHeight: 1.7, color: C.ink2, marginTop: 24 }}>
            Tunjukkan QR di pintu masuk dan naikkan kecerahan layar saat dipindai. Jika kamera panitia bermasalah,
            sebutkan kode di bawah QR. E-tiket juga terlampir sebagai PDF dan selalu tersedia di{" "}
            <Link href={p.ticketsUrl} style={{ color: C.ink }}>
              Tiket Saya
            </Link>
            .
          </Text>
          <Hr style={{ borderColor: C.rule, margin: "32px 0 16px" }} />
          <Text style={{ ...mono, fontSize: 12, color: C.ink3, margin: 0 }}>Pesanan {p.orderCode}</Text>
          <Text style={{ fontSize: 12, color: C.ink3 }}>Satu tiket, satu pintu masuk.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default TicketEmail;
