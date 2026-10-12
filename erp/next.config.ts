import type { NextConfig } from "next";

/*
 * Cache Components fica desligado de propósito: toda página do ERP lê a sessão
 * (cookies) e dados do banco a cada request. Com cacheComponents ligado, cada
 * leitura de cookies() exigiria Suspense e a sessão não poderia ser lida no
 * layout. Decisão registrada em docs/arquitetura.md.
 */
const nextConfig: NextConfig = {
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
