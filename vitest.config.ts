import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Only the pure logic is tested here -- formations, money, and the team
 * balancer -- so there is no environment to set up: no DOM, no database, no
 * server. The alias is the one thing it needs, because that code imports the
 * same `@/` paths the app does.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
