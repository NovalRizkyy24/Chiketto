import nodemailer from "nodemailer";
import { Resend } from "resend";

export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
  /** Untuk gambar inline: dirujuk di HTML sebagai `cid:<contentId>`. */
  contentId?: string;
};

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
};

const from = () => process.env.EMAIL_FROM ?? "Chiketto <tiket@chiketto.local>";

/**
 * Kirim email lewat Resend bila RESEND_API_KEY diisi,
 * selain itu lewat SMTP (Mailpit di lingkungan lokal).
 */
export async function sendMail(mail: Mail) {
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: from(),
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: mail.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
        contentId: a.contentId,
      })),
    });
    if (error) throw new Error(`Resend: ${error.message}`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });
  await transport.sendMail({
    from: from(),
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    attachments: mail.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
      cid: a.contentId,
    })),
  });
}

export function appUrl(path = "") {
  return `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}${path}`;
}
