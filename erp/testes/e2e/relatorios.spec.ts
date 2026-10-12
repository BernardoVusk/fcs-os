import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

// Relatórios com período e exportação CSV e XLSX; alertas com verificação; auditoria com filtro.
test("relatórios: abas, período e exportação em CSV e XLSX", async ({ page }) => {
  await entrar(page);
  await page.goto("/relatorios");
  await expect(page.getByRole("heading", { name: "Relatórios" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("link", { name: "Por canal" }).click();
  await expect(page.getByRole("columnheader", { name: "Canal" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("link", { name: "12 meses" }).click();
  await expect(page).toHaveURL(/aba=canal.*periodo=12m|periodo=12m.*aba=canal/);
  await page.getByRole("link", { name: "Consumo de filamento" }).click();
  await expect(page.getByRole("columnheader", { name: "Gramas" })).toBeVisible({ timeout: 60_000 });

  const csv = await page.request.get(
    "/relatorios/exportar?relatorio=produto&periodo=mes&formato=csv",
  );
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const texto = await csv.text();
  expect(texto.startsWith("﻿Produto;Quantidade;")).toBe(true);

  const xlsx = await page.request.get(
    "/relatorios/exportar?relatorio=tudo&periodo=mes&formato=xlsx",
  );
  expect(xlsx.status()).toBe(200);
  expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");
  const corpo = await xlsx.body();
  expect(corpo[0]).toBe(0x50);
  expect(corpo[1]).toBe(0x4b);
  expect(corpo.length).toBeGreaterThan(500);
});

test("alertas: verificar agora e auditoria filtrada", async ({ page }) => {
  await entrar(page);
  await page.goto("/alertas");
  await expect(page.getByRole("heading", { name: "Alertas" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Verificar agora" }).click();
  await expect(page.getByText(/Verificação feita/)).toBeVisible({ timeout: 60_000 });
  await page.getByRole("link", { name: "Resolvidos" }).click();
  await expect(page).toHaveURL(/filtro=resolvidos/);

  await page.goto("/configuracoes/auditoria?acao=update");
  await expect(page.getByRole("heading", { name: "Auditoria" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel("Ação")).toHaveValue("update");
  await expect(page.getByRole("button", { name: "Filtrar" })).toBeVisible();
});
