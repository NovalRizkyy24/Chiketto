"use client";

import { useState } from "react";

type Point = { date: string; qty: number };

const label = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`))
    .replace(".", "");

/** Penjualan harian: kolom tipis sumi, hari puncak diberi label langsung. */
export function DailySalesChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return <p className="text-sm text-ink-3">Belum ada penjualan.</p>;

  const max = Math.max(...data.map((d) => d.qty));
  const peak = data.findIndex((d) => d.qty === max);

  return (
    <figure>
      <div className="relative flex h-40 items-end gap-0.5 border-b border-rule" aria-hidden="true">
        {data.map((d, i) => (
          <div
            key={d.date}
            className="group relative flex h-full min-w-0.75 max-w-3 flex-1 items-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              className={`w-full ${hover === null || hover === i ? "bg-ink" : "bg-ink-3"}`}
              style={{ height: d.qty === 0 ? 0 : `${Math.max(2, (d.qty / max) * 100)}%` }}
            />
            {i === peak || hover === i ? (
              <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap bg-paper px-1 font-mono text-xs tabular text-ink">
                {d.qty} · {label(d.date)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-xs text-ink-3">
        <span>{label(data[0].date)}</span>
        <span>{label(data[data.length - 1].date)}</span>
      </figcaption>
      <table className="sr-only">
        <caption>Tiket terjual per hari</caption>
        <thead>
          <tr>
            <th scope="col">Tanggal</th>
            <th scope="col">Tiket</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{label(d.date)}</td>
              <td>{d.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
