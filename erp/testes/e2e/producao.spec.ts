import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

// Produto com a ficha do caso A1, cálculo de custo, ordem de 2 peças concluída pela tela.
const marca = Date.now();
let versao = 0;
let impressoraId = "";
let insumoId = "";
let compraId = "";

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
        dados: {
          tarifa_kwh: 0.95,
          custo_hora_mao_obra: 30,
          metodo_rateio_fixo: "desligado",
          imposto_pct_estimado: 0.06,
          margem_alvo_padrao: 0.25,
          taxa_falha_padrao: 0,
          desperdicio_padrao: 0,
        },
        observacoes: `E2E ${marca}`,
      })
      .select("versao")
      .single()
  ).data!.versao;
  impressoraId = (
    await admin
      .from("impressoras")
      .insert({
        nome: `E2E impressora prod ${marca}`,
        custo_aquisicao: 4500,
        valor_residual: 500,
        vida_util_horas: 8000,
        potencia_media_w: 120,
        custo_manutencao_ano: 400,
        custo_consumiveis_ano: 200,
        horas_produtivas_ano: 2000,
      })
      .select("id")
      .single()
  ).data!.id;
  insumoId = (
    await admin
      .from("insumos")
      .insert({ nome: `E2E PLA prod ${marca}`, tipo: "filamento", unidade_base: "g" })
      .select("id")
      .single()
  ).data!.id;
  compraId = (
    await admin
      .from("compras")
      .insert({ data: "2026-10-12", numero_documento: `E2E-P-${marca}` })
      .select("id")
      .single()
  ).data!.id;
  await admin.from("compras_itens").insert({
    compra_id: compraId,
    ordem: 0,
    insumo_id: insumoId,
    quantidade: 1,
    unidade: "un",
    preco_unitario: 125,
    peso_util_g: 1000,
  });
  const r = await admin.rpc("confirmar_compra", { p_compra: compraId });
  if (r.error) throw r.error;
});

test.afterAll(async () => {
  const admin = await servico();
  if (!admin) return;
  const { data: produtos } = await admin.from("produtos").select("id").like("nome", "E2E %");
  const ids = (produtos ?? []).map((p) => p.id);
  if (ids.length) {
    await admin.from("ordens_producao").delete().in("produto_id", ids);
    await admin.from("movimentacoes_produto").delete().in("produto_id", ids);
    await admin.from("calculos_custo").delete().in("produto_id", ids);
    await admin.from("alertas").delete().in("entidade_id", ids);
    await admin.from("produtos").delete().in("id", ids);
  }
  if (insumoId) {
    const { data: lotes } = await admin.from("lotes_insumo").select("id").eq("insumo_id", insumoId);
    await admin
      .from("alertas")
      .delete()
      .in("entidade_id", [insumoId, ...(lotes ?? []).map((l) => l.id)]);
    await admin.from("movimentacoes_estoque").delete().eq("insumo_id", insumoId);
    await admin.from("lotes_insumo").delete().eq("insumo_id", insumoId);
    if (compraId) await admin.from("compras").delete().eq("id", compraId);
    await admin.from("insumos").delete().eq("id", insumoId);
  }
  if (impressoraId) await admin.from("impressoras").delete().eq("id", impressoraId);
  if (versao) await admin.from("parametros_custo").delete().eq("versao", versao);
});

test("cria produto, calcula o custo A1, produz 2 peças e vê o custo realizado", async ({
  page,
}) => {
  const nome = `E2E Produto ${marca}`;
  await entrar(page);
  await page.goto("/catalogo/produtos/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByLabel("Peso (g)").fill("40");
  await page.getByLabel("Tempo de impressão (min)").fill("120");
  await page.getByLabel("Preparo por ciclo (min)").fill("5");
  await page.getByLabel("Acabamento por peça (min)").fill("4");
  await page.getByLabel("Embalagem por peça (min)").fill("3");
  await page
    .getByLabel("Filamento", { exact: true })
    .selectOption({ label: `E2E PLA prod ${marca}` });
  await page
    .getByLabel("Impressora padrão")
    .selectOption({ label: `E2E impressora prod ${marca}` });
  await page.getByRole("button", { name: "Criar produto" }).click();
  await page.waitForURL(/\/catalogo\/produtos\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: nome })).toBeVisible();

  await page.getByRole("button", { name: "Calcular custo" }).click();
  await expect(page.getByText("Custo calculado: R$ 12,8280 por peça.")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("R$ 12,8280").first()).toBeVisible();

  await page.getByRole("link", { name: "Nova ordem de produção" }).click();
  await expect(page.getByRole("heading", { name: "Nova ordem de produção" })).toBeVisible();
  await page.getByLabel("Quantidade", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Criar ordem" }).click();
  await page.waitForURL(/\/producao\/ordens\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /OP-\d{4}/ })).toBeVisible();

  await page.getByRole("button", { name: "Começar a imprimir" }).click();
  await expect(page.getByText("Ordem atualizada.")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Concluir ordem" }).first().click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByLabel("Quantidade (g)")).toHaveValue("80");
  await dialogo.getByLabel("Tempo real de impressão (min)").fill("240");
  await dialogo.getByLabel("Mão de obra (min)").fill("24");
  await dialogo.getByRole("button", { name: "Concluir ordem" }).click();
  await expect(page.getByText("Ordem concluída. Custo realizado R$ 25,66.")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("2 boas")).toBeVisible();
  await expect(page.getByText("R$ 25,66", { exact: true })).toHaveCount(2);
});
