import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

// Pedido manual com os números do caso C1 (2 x 32,51 + 1 x 32,08, cupom 5, frete pago 3): a receber 62,37.
const marca = Date.now();
let versao = 0;
let canalId = "";
let produtoId = "";

async function servico() {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

test.beforeAll(async () => {
  const admin = await servico();
  if (!admin) return;
  versao = (
    await admin
      .from("parametros_custo")
      .insert({
        vigente_desde: new Date().toISOString().slice(0, 10),
        dados: { imposto_pct_estimado: 0.06 },
        observacoes: `E2E ${marca}`,
      })
      .select("versao")
      .single()
  ).data!.versao;
  canalId = (
    await admin
      .from("canais_venda")
      .insert({ nome: `E2E canal vendas ${marca}`, tipo: "outro" })
      .select("id")
      .single()
  ).data!.id;
  await admin
    .from("canais_venda_taxas")
    .insert({
      canal_id: canalId,
      vigente_desde: "2026-01-01",
      comissao_pct: 0.14,
      taxa_pagamento_pct: 0.02,
      ads_pct_padrao: 0,
      taxa_fixa_item: 4,
      frete_subsidio_padrao: 0,
    });
  produtoId = (
    await admin
      .from("produtos")
      .insert({
        nome: `E2E Produto vendas ${marca}`,
        status: "ativo",
        custo_atual: 15,
        custo_variavel_atual: 13.228,
      })
      .select("id")
      .single()
  ).data!.id;
});

test.afterAll(async () => {
  const admin = await servico();
  if (!admin) return;
  if (canalId) await admin.from("pedidos").delete().eq("canal_id", canalId);
  if (produtoId) await admin.from("produtos").delete().eq("id", produtoId);
  if (canalId) await admin.from("canais_venda").delete().eq("id", canalId);
  if (versao) await admin.from("parametros_custo").delete().eq("versao", versao);
});

test("cria pedido manual, vê o resumo C1 e marca pagamento aprovado", async ({ page }) => {
  await entrar(page);
  await page.goto("/vendas/pedidos/novo");
  await expect(page.getByRole("heading", { name: "Novo pedido" })).toBeVisible();
  await page
    .getByLabel("Canal", { exact: true })
    .selectOption({ label: `E2E canal vendas ${marca}` });
  await page.getByLabel("Código no canal").fill(`E2E-${marca}`);
  const produto = page.getByLabel("Produto").first();
  await produto.selectOption({ label: `E2E Produto vendas ${marca}` });
  await page.getByLabel("Quantidade").first().fill("2");
  await page.getByLabel("Preço unitário").first().fill("32,51");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await page.getByLabel("Produto").nth(1).selectOption("");
  await page.getByLabel("Título do item").fill("Item avulso");
  await page.getByLabel("Quantidade").nth(1).fill("1");
  await page.getByLabel("Preço unitário").nth(1).fill("32,08");
  await page.getByLabel("Cupom do vendedor (R$)").fill("5");
  await page.getByLabel("Frete pago por nós (R$)").fill("3");
  await expect(page.getByText("R$ 62,37").first()).toBeVisible();
  await page.getByRole("button", { name: "Criar pedido" }).click();
  await page.waitForURL(/\/vendas\/pedidos\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /PED-\d{5}/ })).toBeVisible();
  await expect(page.getByText("R$ 62,37").first()).toBeVisible();
  await expect(page.getByText("R$ 5,53").first()).toBeVisible();

  await page.getByLabel("Novo status").selectOption("pagamento_aprovado");
  await page.getByRole("button", { name: "Mudar status" }).click();
  await expect(page.getByText("Status alterado.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Pago", { exact: true })).toBeVisible();
  await expect(page.getByText("R$ 13,2280").first()).toBeVisible();
});
