import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/upload";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Menyajikan poster yang diunggah lokal (mode tanpa Cloudinary). */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const m = /^([a-f0-9]{24})\.(jpg|png|webp)$/.exec(name);
  if (!m) return new Response("Tidak ditemukan", { status: 404 });
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": TYPES[m[2]], "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Tidak ditemukan", { status: 404 });
  }
}
