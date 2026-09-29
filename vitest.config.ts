import { defineConfig } from "vitest/config";
import path from "node:path";

try {
  process.loadEnvFile();
} catch {}

const integration = process.argv.some((a) => a.includes("integration"));
const testDb = process.env.TEST_DATABASE_URL ?? "postgresql://chiketto:chiketto@localhost:5434/chiketto_test";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: integration ? ["tests/integration/global-setup.ts"] : [],
    env: {
      QR_SECRET: "test-secret-yang-cukup-panjang-untuk-hmac",
      MIDTRANS_SERVER_KEY: "",
      MIDTRANS_CLIENT_KEY: "",
      ...(integration ? { DATABASE_URL: `${testDb}${testDb.includes("?") ? "&" : "?"}connection_limit=20` } : {}),
    },
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
