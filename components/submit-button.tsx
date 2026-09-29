"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Memproses…",
  variant = "primary",
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "text";
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={`${variant === "text" ? "btn-text" : `btn btn-${variant}`} ${className}`}
    >
      {/* Lebar tetap: kedua label ditumpuk, yang tak aktif disembunyikan. */}
      <span className="grid">
        <span className={`col-start-1 row-start-1 ${pending ? "invisible" : ""}`}>{children}</span>
        <span className={`col-start-1 row-start-1 ${pending ? "" : "invisible"}`} aria-hidden={!pending}>
          {pendingLabel}
        </span>
      </span>
    </button>
  );
}
