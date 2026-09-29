import NextAuth, { type DefaultSession } from "next-auth";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { sendMail } from "./email";
import { DEMO_ACCOUNTS, demoLoginEnabled } from "./demo";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

const providers: Provider[] = [
  {
    id: "email",
    name: "Email",
    type: "email",
    maxAge: 60 * 60 * 24,
    async sendVerificationRequest({ identifier, url }) {
      await sendMail({
        to: identifier,
        subject: "Tautan masuk Chiketto",
        text: `Buka tautan ini untuk masuk ke Chiketto:\n${url}\n\nTautan berlaku 24 jam. Abaikan email ini jika kamu tidak meminta masuk.`,
        html: `<p style="font-family:sans-serif;font-size:16px;line-height:1.7">Buka tautan ini untuk masuk ke Chiketto.</p>
<p><a href="${url}" style="display:inline-block;background:#1c1f24;color:#f5f3ee;padding:12px 20px;border-radius:2px;text-decoration:none;font-family:sans-serif;font-weight:700">Masuk ke Chiketto</a></p>
<p style="font-family:sans-serif;font-size:14px;color:#6b6e73">Tautan berlaku 24 jam. Abaikan email ini jika kamu tidak meminta masuk.</p>`,
      });
    },
  } as Provider,
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google);

if (demoLoginEnabled()) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Akun demo",
      credentials: { email: { label: "Email" } },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "");
        if (!DEMO_ACCOUNTS.some((a) => a.email === email)) return null;
        return db.user.findUnique({ where: { email } });
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // JWT agar login demo (Credentials) dan magic link bisa hidup berdampingan.
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/masuk", verifyRequest: "/masuk/cek-email", error: "/masuk" },
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

export const googleEnabled = () => Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
