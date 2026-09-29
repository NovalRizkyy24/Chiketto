import { orgForPage } from "../guard";
import { OrgForm } from "./org-form";

export default async function SettingsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org } = await orgForPage(orgSlug);
  return (
    <>
      <h1 className="text-2xl">Pengaturan</h1>
      <OrgForm orgSlug={orgSlug} name={org.name} />
      <dl className="mt-12 grid max-w-[480px] grid-cols-[8rem_minmax(0,1fr)] gap-y-2 text-sm">
        <dt className="text-ink-3">Alamat</dt>
        <dd className="font-mono">{org.slug}</dd>
        <dt className="text-ink-3">Verifikasi</dt>
        <dd>{org.verifiedAt ? "Terverifikasi" : "Menunggu verifikasi admin platform"}</dd>
      </dl>
    </>
  );
}
