/*
 * Capturas de tela das telas principais nos dois temas e três larguras, para a revisão visual da Fase 10.
 * uso: node ferramentas/capturas.mjs   (servidor dev no ar em localhost:3000; E2E_EMAIL e E2E_SENHA em .env.local)
 * saída: testes/relatorios/capturas/<tema>-<largura>-<rota>.png
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { carregarEnv, exigirEnv } from "./env.mjs";

carregarEnv();
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const email = exigirEnv("E2E_EMAIL");
const senha = exigirEnv("E2E_SENHA");
const rotas = process.argv[2]
  ? process.argv[2].split(",")
  : [
      "/",
      "/planejamento",
      "/financeiro",
      "/relatorios",
      "/alertas",
      "/estoque/insumos",
      "/vendas/pedidos",
      "/catalogo/precificacao",
    ];
const larguras = [1440, 1024, 390];
const temas = (process.env.CAPTURAS_TEMAS ?? "escuro,claro").split(",");
const pasta = "testes/relatorios/capturas";
mkdirSync(pasta, { recursive: true });

const navegador = await chromium.launch();
try {
  for (const tema of temas) {
    const contexto = await navegador.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "pt-BR",
    });
    const pagina = await contexto.newPage();
    await pagina.goto(`${base}/login`);
    await pagina.getByLabel("E-mail").fill(email);
    await pagina.getByLabel("Senha").fill(senha);
    await pagina.getByRole("button", { name: "Entrar" }).click();
    await pagina.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 });
    await contexto.addCookies([
      { name: "fcs-tema", value: tema === "claro" ? "claro" : "escuro", url: base },
    ]);
    for (const largura of larguras) {
      await pagina.setViewportSize({ width: largura, height: largura < 500 ? 844 : 900 });
      for (const rota of rotas) {
        await pagina.goto(`${base}${rota}`, { waitUntil: "networkidle", timeout: 90_000 });
        await pagina.waitForTimeout(400);
        const nome = `${tema}-${largura}-${rota === "/" ? "inicio" : rota.slice(1).replace(/\//g, "_")}.png`;
        await pagina.screenshot({ path: `${pasta}/${nome}`, fullPage: true });
        console.log("ok", nome);
      }
    }
    await contexto.close();
  }
} finally {
  await navegador.close();
}
