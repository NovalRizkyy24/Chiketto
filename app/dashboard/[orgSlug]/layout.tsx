import { notFound } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { AppError } from "@/lib/errors";
import { requireOrganizer, requireUserPage } from "@/lib/permissions";
import { DashboardNav } from "./dashboard-nav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await requireUserPage(`/dashboard/${orgSlug}`);
  const org = await requireOrganizer(user.id, { slug: orgSlug }).catch((e) => {
    if (e instanceof AppError) notFound();
    throw e;
  });

  return (
    <div className="page pt-6 pb-16">
      <div className="flex items-start justify-between gap-4">
        <Wordmark />
        <a href="/" className="inline-flex min-h-11 items-center text-sm hover:underline underline-offset-4">
          Lihat situs
        </a>
      </div>
      <div className="mt-12 grid gap-10 md:grid-cols-[180px_minmax(0,1fr)] md:gap-12">
        <aside>
          <p className="font-display text-lg break-anywhere">{org.name}</p>
          {!org.verifiedAt ? <p className="mt-1 text-xs text-ink-3">Menunggu verifikasi admin</p> : null}
          <DashboardNav orgSlug={org.slug} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
