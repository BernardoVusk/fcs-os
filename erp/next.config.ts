import type { NextConfig } from "next";

/*
 * Cache Components fica desligado de propósito: toda página do ERP lê a sessão
 * (cookies) e dados do banco a cada request. Com cacheComponents ligado, cada
 * leitura de cookies() exigiria Suspense e a sessão não poderia ser lida no
 * layout. Decisão registrada em docs/arquitetura.md.
 */
const CABECALHOS_SEGURANCA = [
  // Painel autenticado com ações por clique: nunca pode ser embutido em iframe de terceiros.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: false,
  async headers() {
    return [{ source: "/(.*)", headers: CABECALHOS_SEGURANCA }];
  },
  // Arquivos grandes (STL, 3MF, G-code, anexos) vão direto do navegador para o Storage por URL assinada;
  // a server action só recebe metadados e CSVs. A Vercel limita o corpo da requisição a 4,5 MB.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
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
