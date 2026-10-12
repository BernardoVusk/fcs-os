import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["testes/integracao/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    globalSetup: ["testes/integracao/setup-global.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Módulos server-only são testados fora do React: o marcador vira módulo vazio.
      "server-only": fileURLToPath(new URL("./testes/integracao/server-only.ts", import.meta.url)),
    },
  },
});
