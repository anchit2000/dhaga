import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the PURE parts of the mobile app — no React Native runtime,
 * no native modules. The modules under test declare their own device record
 * shapes (see src/lib/sync/fields/types.ts) precisely so they can run here.
 *
 * apps/web's vitest project used to host the one mobile unit test
 * (src/lib/__tests__/device-contact-map.test.ts), which works only because that
 * mapper imports nothing through the `@/` alias — `@` resolves to apps/web/src
 * there. The sync modules do use `@/`, so they need this config's alias.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
