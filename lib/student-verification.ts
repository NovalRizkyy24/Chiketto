import { createHash, randomInt } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { audit } from "./audit";
import { AppError } from "./errors";
import { sendMail } from "./email";

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

export const requestSchema = z.object({ email: z.string().trim().toLowerCase().email("Format email tidak valid.") });
export const confirmSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Kode terdiri dari 6 angka.") });

export async function requestStudentCode(userId: string, input: unknown) {
  const { email } = requestSchema.parse(input);
  const domain = email.split("@")[1];
  const campus = await db.campus.findUnique({ where: { emailDomain: domain } });
  if (!campus) {
    const campuses = await db.campus.findMany({ select: { emailDomain: true } });
    const hint = campuses.map((c) => `@${c.emailDomain}`).join(" atau ");
    throw new AppError(`Email ini bukan email kampus. Gunakan alamat yang berakhiran ${hint}.`, 422, "NOT_CAMPUS");
  }
  const taken = await db.user.findFirst({ where: { studentEmail: email, NOT: { id: userId } } });
  if (taken) throw new AppError("Email kampus ini sudah terhubung ke akun lain.", 409);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.studentVerification.create({
    data: { userId, email, codeHash: hash(code), expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000) },
  });
  await sendMail({
    to: email,
    subject: `Kode verifikasi Chiketto: ${code}`,
    text: `Kode verifikasi email kampus kamu: ${code}\nBerlaku ${CODE_TTL_MIN} menit.`,
    html: `<p style="font-family:sans-serif;font-size:16px;line-height:1.7">Kode verifikasi email kampus kamu:</p>
<p style="font-family:monospace;font-size:32px;letter-spacing:0.2em;margin:16px 0">${code}</p>
<p style="font-family:sans-serif;font-size:14px;color:#6b6e73">Berlaku ${CODE_TTL_MIN} menit.</p>`,
  });
  return { email };
}

export async function confirmStudentCode(userId: string, input: unknown) {
  const { code } = confirmSchema.parse(input);
  const v = await db.studentVerification.findFirst({
    where: { userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!v || v.expiresAt < new Date()) {
    throw new AppError("Kode sudah kedaluwarsa. Minta kode baru.", 410, "CODE_EXPIRED");
  }
  if (v.attempts >= MAX_ATTEMPTS) {
    throw new AppError("Terlalu banyak percobaan salah. Minta kode baru.", 429, "TOO_MANY_ATTEMPTS");
  }
  if (v.codeHash !== hash(code)) {
    await db.studentVerification.update({ where: { id: v.id }, data: { attempts: { increment: 1 } } });
    const left = MAX_ATTEMPTS - v.attempts - 1;
    throw new AppError(
      left > 0 ? `Kode salah. Sisa ${left} percobaan.` : "Kode salah. Minta kode baru.",
      422,
      "WRONG_CODE",
    );
  }
  const campus = await db.campus.findUniqueOrThrow({ where: { emailDomain: v.email.split("@")[1] } });
  await db.$transaction([
    db.studentVerification.update({ where: { id: v.id }, data: { consumedAt: new Date() } }),
    db.user.update({
      where: { id: userId },
      data: { studentEmail: v.email, studentVerifiedAt: new Date(), campusId: campus.id },
    }),
  ]);
  await audit("student.verified", userId, { actorId: userId });
}
