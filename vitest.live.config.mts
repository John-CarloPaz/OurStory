import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Live end-to-end suite against the Supabase project in .env.local. Run with `npm run test:live`. */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/unit/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/live/**/*.test.ts"],
    environment: "node",
    hookTimeout: 180_000,
    testTimeout: 120_000,
    fileParallelism: false,
  },
});
