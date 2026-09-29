/** Bar kuota: garis 2px sumi di atas paper-3, terisi sekali saat tampil. */
export function QuotaBar({ used, quota, label }: { used: number; quota: number; label: string }) {
  const ratio = quota > 0 ? Math.min(1, used / quota) : 1;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={quota}
      aria-valuenow={used}
      className="relative h-0.5 w-full bg-paper-3"
    >
      <div className="quota-fill absolute inset-y-0 left-0 w-full bg-ink" style={{ transform: `scaleX(${ratio})` }} />
    </div>
  );
}
