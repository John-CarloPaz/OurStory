import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside a React Server Components bundle.
      "server-only": fileURLToPath(new URL("./tests/unit/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // The live Supabase suite only runs through vitest.live.config.mts.
    exclude: [...configDefaults.exclude, "tests/live/**"],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    },
    hookTimeout: 120_000,
    testTimeout: 60_000,
    // Database suites share one disposable database per file; keep files serial.
    fileParallelism: false,
  },
});
