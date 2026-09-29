import { execSync } from "node:child_process";

/** Samakan skema database tes dengan prisma/schema.prisma. Data dibersihkan per tes (truncateAll). */
export default function setup() {
  try {
    process.loadEnvFile();
  } catch {}
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://chiketto:chiketto@localhost:5434/chiketto_test";
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
