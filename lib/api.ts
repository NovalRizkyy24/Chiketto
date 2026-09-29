import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

/** Ubah error menjadi respons JSON dengan status yang tepat. */
export function handleApiError(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: err.issues[0]?.message ?? "Data tidak valid.", code: "VALIDATION", issues: err.issues },
      { status: 422 },
    );
  }
  console.error(err);
  return NextResponse.json({ error: "Terjadi kesalahan di server. Coba lagi sebentar lagi." }, { status: 500 });
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/** Pesan error untuk Server Action (dikembalikan sebagai state form). */
export function actionError(err: unknown): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof ZodError) return err.issues[0]?.message ?? "Data tidak valid.";
  console.error(err);
  return "Terjadi kesalahan di server. Coba lagi sebentar lagi.";
}
