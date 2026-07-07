import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@/components": fileURLToPath(new URL("../frontend/src/components/", import.meta.url)),
      "@/lib": fileURLToPath(new URL("../backend/lib/", import.meta.url)),
      "@": fileURLToPath(new URL("../frontend/src/", import.meta.url)),
    },
  },
  test: {
    environment: "node",
  },
});
