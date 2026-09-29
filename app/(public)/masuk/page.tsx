import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { SubmitButton } from "@/components/submit-button";
import { auth, googleEnabled, signIn } from "@/lib/auth";
import { DEMO_ACCOUNTS, demoLoginEnabled } from "@/lib/demo";

export const metadata: Metadata = { title: "Masuk" };

const safeCallback = (v: unknown) =>
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/";

const ERRORS: Record<string, string> = {
  EmailSignInError: "Tautan masuk gagal dikirim. Periksa alamat email lalu coba lagi.",
  Verification: "Tautan masuk sudah kedaluwarsa atau sudah dipakai. Minta tautan baru.",
  OAuthAccountNotLinked: "Email ini sudah terdaftar lewat metode lain. Masuk dengan tautan email.",
  CredentialsSignin: "Akun demo tidak ditemukan. Jalankan seed database dulu.",
};

type Props = { searchParams: Promise<{ callbackUrl?: string; error?: string }> };

/** Ubah AuthError menjadi pesan di halaman; redirect sukses (NEXT_REDIRECT) diteruskan. */
async function withAuthError(callbackUrl: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    if (e instanceof AuthError) {
      redirect(`/masuk?error=${e.type}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw e;
  }
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const callbackUrl = safeCallback(sp.callbackUrl);
  if ((await auth())?.user) redirect(callbackUrl);

  async function emailLogin(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    await withAuthError(callbackUrl, () => signIn("email", { email, redirectTo: callbackUrl }));
  }

  async function googleLogin() {
    "use server";
    await withAuthError(callbackUrl, () => signIn("google", { redirectTo: callbackUrl }));
  }

  async function demoLogin(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    await withAuthError(callbackUrl, () => signIn("demo", { email, redirectTo: callbackUrl }));
  }

  const error = sp.error ? (ERRORS[sp.error] ?? "Gagal masuk. Coba lagi.") : null;

  return (
    <div className="page">
      <div className="max-w-[420px]">
        <h1 className="text-3xl">Masuk</h1>
        <p className="mt-3 text-ink-2">Masuk untuk membeli tiket dan membuka Tiket Saya.</p>

        {error ? (
          <p role="alert" className="field-error mt-6">
            {error}
          </p>
        ) : null}

        <form action={emailLogin} className="mt-10 flex flex-col gap-4">
          <label className="field">
            <span className="label">Email</span>
            <input name="email" type="email" required autoComplete="email" className="input" />
          </label>
          <SubmitButton pendingLabel="Mengirim tautan…">Kirim tautan masuk</SubmitButton>
        </form>

        {googleEnabled() ? (
          <form action={googleLogin} className="mt-4">
            <SubmitButton variant="secondary" className="w-full">
              Masuk dengan Google
            </SubmitButton>
          </form>
        ) : null}

        {demoLoginEnabled() ? (
          <section className="mt-16 border-t border-rule pt-6" aria-labelledby="akun-demo">
            <h2 id="akun-demo" className="text-lg">
              Coba dengan akun demo
            </h2>
            <ul className="mt-2">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email} className="border-b border-rule">
                  <form action={demoLogin} className="flex min-h-[56px] items-center justify-between gap-4 py-2">
                    <input type="hidden" name="email" value={a.email} />
                    <span>
                      <span className="block">{a.label}</span>
                      <span className="block text-sm text-ink-3">{a.note}</span>
                    </span>
                    <SubmitButton variant="text" pendingLabel="Masuk…">
                      Masuk sebagai {a.label.toLowerCase()}
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
