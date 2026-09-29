"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardNav({ orgSlug }: { orgSlug: string }) {
  const path = usePathname();
  const base = `/dashboard/${orgSlug}`;
  const items = [
    { href: `${base}/events`, label: "Event", match: (p: string) => p === base || p.startsWith(`${base}/events`) },
    { href: `${base}/peserta`, label: "Peserta" },
    { href: `${base}/panitia`, label: "Panitia" },
    { href: `${base}/pengaturan`, label: "Pengaturan" },
  ];
  return (
    <nav aria-label="Dashboard" className="mt-4 flex flex-wrap gap-x-5 md:mt-8 md:flex-col">
      {items.map((i) => {
        const active = i.match ? i.match(path) : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center text-sm ${active ? "font-bold text-ink" : "text-ink-2 hover:text-ink"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
