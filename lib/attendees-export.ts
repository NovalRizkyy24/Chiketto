import ExcelJS from "exceljs";
import { formatDateLong } from "./format-date";
import type { listAttendees } from "./events";

type Rows = Awaited<ReturnType<typeof listAttendees>>;

const STATUS: Record<string, string> = { ACTIVE: "Belum masuk", CHECKED_IN: "Sudah masuk", VOID: "Dibatalkan" };

function toRecords(rows: Rows, tz: string) {
  return rows.map((t) => ({
    kode: t.code,
    nama: t.holderName,
    email: t.owner.email,
    jenis: t.ticketType.name,
    harga: t.ticketType.price,
    pesanan: t.order.code,
    status: STATUS[t.status],
    masuk: t.checkedInAt ? formatDateLong(t.checkedInAt, tz) : "",
  }));
}

const HEADERS = [
  ["kode", "Kode tiket"],
  ["nama", "Nama"],
  ["email", "Email"],
  ["jenis", "Jenis tiket"],
  ["harga", "Harga"],
  ["pesanan", "Kode pesanan"],
  ["status", "Status"],
  ["masuk", "Waktu masuk"],
] as const;

export async function attendeesXlsx(rows: Rows, tz: string, title: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Chiketto";
  const ws = wb.addWorksheet("Peserta");
  ws.columns = HEADERS.map(([key, header]) => ({ key, header, width: key === "email" ? 32 : 18 }));
  ws.getRow(1).font = { bold: true };
  ws.addRows(toRecords(rows, tz));
  ws.getColumn("harga").numFmt = '"Rp" #,##0';
  wb.title = title;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function attendeesCsv(rows: Rows, tz: string): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    // Cegah formula injection saat dibuka di spreadsheet.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const records = toRecords(rows, tz);
  return [
    HEADERS.map(([, h]) => h).join(","),
    ...records.map((r) => HEADERS.map(([k]) => esc(r[k])).join(",")),
  ].join("\n");
}
