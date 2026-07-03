import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Repo/DB tests run against an in-memory PGlite; embeddings stay off so
    // CI never downloads the model.
    env: {
      DHAGA_DATA_DIR: "memory://",
      DHAGA_EMBEDDINGS: "off",
    },
  },
});
