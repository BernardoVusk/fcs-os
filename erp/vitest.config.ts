import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "ferramentas/**/*.test.mjs",
      "worker/src/**/*.test.ts",
    ],
    environment: "node",
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
