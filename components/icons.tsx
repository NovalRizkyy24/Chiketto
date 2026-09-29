type P = { className?: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function TicketIcon({ className, size = 22 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z" />
      <path d="M15 7v10" strokeDasharray="2 2" />
    </svg>
  );
}

export function CheckIcon({ className, size = 22 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function BangIcon({ className, size = 22 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 5v9M12 18.5v.5" />
    </svg>
  );
}

export function CrossIcon({ className, size = 22 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function QuestionIcon({ className, size = 22 }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9 9a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1.2-1.5 2.2v.7M12 18.5v.5" />
    </svg>
  );
}
