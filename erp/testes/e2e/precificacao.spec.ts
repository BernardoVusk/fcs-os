import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

// Caso de referência da seção 7.4 da spec: prepara parâmetros, impressora e canal pela service role
// (o banco de dev é o real) e confere 47,49 e 71,71 na tela.
const marca = Date.now();
let canalId = "";
let versao = 0;
let impressoraId = "";

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
  const { data: v } = await admin
    .from("parametros_custo")
    .insert({
      vigente_desde: "2026-01-03",
      dados: {
        tarifa_kwh: 0.95,
        custo_hora_mao_obra: 30,
        metodo_rateio_fixo: "hora",
        custo_fixo_mensal: 600,
        horas_produtivas_mes: 200,
        imposto_pct_estimado: 0.06,
      },
      observacoes: `E2E ${marca}`,
    })
    .select("versao")
    .single();
  versao = v!.versao;
  const { data: imp } = await admin
    .from("impressoras")
    .insert({
      nome: `E2E impressora ${marca}`,
      custo_aquisicao: 2000,
      valor_residual: 0,
      vida_util_horas: 4000,
      potencia_media_w: 120,
      custo_manutencao_ano: 300,
      custo_consumiveis_ano: 0,
      horas_produtivas_ano: 1500,
    })
    .select("id")
    .single();
  impressoraId = imp!.id;
  const { data: canal } = await admin
    .from("canais_venda")
    .insert({ nome: `E2E canal ${marca}`, tipo: "outro" })
    .select("id")
    .single();
  canalId = canal!.id;
  await admin.from("canais_venda_taxas").insert({
    canal_id: canalId,
    vigente_desde: "2026-01-01",
    comissao_pct: 0.2,
    taxa_fixa_item: 4,
    taxa_pagamento_pct: 0,
    ads_pct_padrao: 0,
    frete_subsidio_padrao: 0,
  });
});

test.afterAll(async () => {
  const admin = await servico();
  if (!admin) return;
  await admin.from("calculos_custo").delete().like("nome", "E2E %");
  if (impressoraId) await admin.from("impressoras").delete().eq("id", impressoraId);
  if (canalId) await admin.from("canais_venda").delete().eq("id", canalId);
  if (versao) await admin.from("parametros_custo").delete().eq("versao", versao);
});

test("calculadora reproduz o caso 7.4 e salva no histórico", async ({ page }) => {
  await entrar(page);
  await page.goto("/catalogo/precificacao");
  await expect(page.getByRole("heading", { name: "Precificação" })).toBeVisible();

  await page.getByLabel("Peso (g)").fill("50");
  await page.getByLabel("Tempo do ciclo (min)").fill("240");
  await page.getByLabel("Peças por ciclo").fill("1");
  await page.getByLabel("Taxa de falha (%)").fill("5");
  await page.getByLabel("Desperdício (%)").fill("5");
  await page.getByLabel("Filamento", { exact: true }).selectOption("manual");
  await page.getByLabel("Custo do filamento (R$/kg)").fill("60");
  await page
    .getByLabel("Impressora", { exact: true })
    .selectOption({ label: `E2E impressora ${marca}` });
  await page.getByLabel("Preparo por ciclo (min)").fill("10");
  await page.getByLabel("Acabamento por peça (min)").fill("10");
  await page.getByLabel("Embalagem por peça (min)").fill("0");
  await page.getByLabel("Mão de obra (R$/h)").fill("30");
  await page.getByLabel("Complementares por peça (R$)").fill("1,50");
  await page.getByLabel("Canal de venda").selectOption({ label: `E2E canal ${marca}` });
  await page.getByLabel("Margem alvo (%)").fill("25");
  await page.getByLabel("Markup (%)").fill("25");

  await expect(page.getByText("R$ 31,1379")).toBeVisible();
  const equilibrio = page.getByRole("region", { name: "Equilíbrio" });
  await expect(equilibrio.getByText("R$ 47,49")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Margem 25 %" }).getByText("R$ 71,71"),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Markup 25 %" }).getByText("R$ 58,01"),
  ).toBeVisible();

  await page.getByLabel("Nome do cálculo").fill(`E2E caso 7.4 ${marca}`);
  await page.getByRole("button", { name: "Salvar cálculo" }).click();
  await expect(page.getByText("Cálculo salvo no histórico.")).toBeVisible();
  await page.getByRole("link", { name: "Ver no histórico" }).click();
  await expect(page.getByRole("heading", { name: "Histórico de cálculos" })).toBeVisible();
  const linha = page.getByRole("row", { name: new RegExp(`E2E caso 7.4 ${marca}`) });
  await expect(linha.getByText("R$ 31,1379")).toBeVisible();
  await expect(linha.getByText("R$ 71,71")).toBeVisible();
});
