import { redirect } from "next/navigation";

export default async function OrgHome({ params }: { params: Promise<{ orgSlug: string }> }) {
  redirect(`/dashboard/${(await params).orgSlug}/events`);
}
