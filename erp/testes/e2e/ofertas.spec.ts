import { expect, test } from "@playwright/test";
import { entrar } from "./apoio";

// Grupos de Ofertas. O banco dev é o de produção: só leitura e modo manual, dados sintéticos
// criados pela service role e apagados no fim. Nenhuma credencial é salva, nada é enviado.
const marca = `E2E ${Date.now()}`;
const criados = { grupo: "", oferta: "", publicacao: "", cupom: "" };

async function servico() {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

test.beforeAll(async () => {
  const a = await servico();
  if (!a) return;
  criados.grupo = (
    await a
      .from("ofe_grupos")
      .insert({ nome: `${marca} grupo`, funcao: "teste" })
      .select("id")
      .single()
  ).data!.id;
  criados.oferta = (
    await a
      .from("ofe_ofertas")
      .insert({
        plataforma: "mercado_livre",
        url_original: "https://produto.mercadolivre.com.br/MLB-1234567890-e2e",
        titulo: `${marca} miniatura`,
        link_colado: "https://mercadolivre.com/sec/e2e",
        status: "pronta",
      })
      .select("id")
      .single()
  ).data!.id;
  criados.publicacao = (
    await a
      .from("ofe_publicacoes")
      .insert({ oferta_id: criados.oferta, modo: "manual" })
      .select("id")
      .single()
  ).data!.id;
  await a.from("ofe_envios").insert({
    publicacao_id: criados.publicacao,
    grupo_id: criados.grupo,
    modo: "manual",
    agendado_para: new Date(Date.now() - 60_000).toISOString(),
    texto_final: `${marca} miniatura\nhttps://mercadolivre.com/sec/e2e`,
    link_url: "https://mercadolivre.com/sec/e2e",
    link_origem: "colado",
    preparado_em: new Date().toISOString(),
  });
  criados.cupom = (
    await a
      .from("ofe_cupons")
      .insert({
        plataforma: "shopee",
        codigo: `E2EVENCIDO${Date.now() % 10000}`,
        descricao: `${marca} cupom`,
        fim_em: new Date(Date.now() - 3_600_000).toISOString(),
      })
      .select("id")
      .single()
  ).data!.id;
});

test.afterAll(async () => {
  const a = await servico();
  if (!a) return;
  if (criados.publicacao) {
    await a.from("ofe_envios").delete().eq("publicacao_id", criados.publicacao);
    await a.from("ofe_publicacoes").delete().eq("id", criados.publicacao);
  }
  const { data: ofertas } = await a.from("ofe_ofertas").select("id").like("titulo", `${marca}%`);
  for (const o of ofertas ?? []) {
    await a.from("ofe_links").delete().eq("oferta_id", o.id);
    await a.from("ofe_ofertas").delete().eq("id", o.id);
  }
  if (criados.cupom) await a.from("ofe_cupons").delete().eq("id", criados.cupom);
  if (criados.grupo) await a.from("ofe_grupos").delete().eq("id", criados.grupo);
});

test("painel e integrações abrem; segredo nunca aparece na página", async ({ page }) => {
  await entrar(page);
  await page.goto("/ofertas");
  await expect(page.getByRole("heading", { name: "Painel de ofertas" })).toBeVisible({
    timeout: 60_000,
  });
  await page.goto("/ofertas/integracoes");
  await expect(page.getByRole("heading", { name: "Integrações de afiliados" })).toBeVisible({
    timeout: 60_000,
  });
  for (const nome of ["Shopee", "Mercado Livre", "Amazon", "Awin"])
    await expect(page.getByRole("heading", { name: nome, exact: true })).toBeVisible();
  const segredos = page.locator('input[type="password"]');
  expect(await segredos.count()).toBeGreaterThan(0);
  for (const s of await segredos.all()) await expect(s).toHaveValue("");
});

test("gera oferta do Mercado Livre à mão até o rascunho", async ({ page }) => {
  await entrar(page);
  await page.goto("/ofertas/gerar");
  await page
    .getByLabel("URL do produto ou link de afiliado")
    .fill("https://produto.mercadolivre.com.br/MLB-9988776655-e2e");
  await page.getByRole("button", { name: "Analisar" }).click();
  await expect(page.getByText("Plataforma:")).toContainText("Mercado Livre", { timeout: 30_000 });
  await page.getByLabel("Nome do produto").fill(`${marca} rascunho`);
  await page.getByLabel("Preço atual (R$)").fill("59,90");
  await expect(page.getByLabel("Preço anterior (R$)")).toHaveValue("");
  await page.getByLabel(/Link de afiliado colado/).fill("https://mercadolivre.com/sec/e2erascunho");
  await expect(page.locator("pre").first()).toContainText("R$ 59,90");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page).toHaveURL(/\/ofertas\/gerar\?id=/, { timeout: 30_000 });
});

test("publica no modo assistido: cartão pronto e marcado uma vez", async ({ page }) => {
  test.skip(
    !criados.publicacao,
    "defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em erp/.env.local",
  );
  await entrar(page);
  await page.goto("/ofertas/publicar");
  const cartao = page.locator("article").filter({ hasText: `${marca} grupo` });
  await expect(cartao).toBeVisible({ timeout: 60_000 });
  await expect(cartao.locator("pre")).toContainText("https://mercadolivre.com/sec/e2e");
  await cartao.getByRole("button", { name: "Marcar como publicado" }).click();
  await expect(page.getByText("Marcado como publicado.")).toBeVisible();
  await expect(page.locator("article").filter({ hasText: `${marca} grupo` })).toHaveCount(0);
});

test("cupom vencido aparece como vencido e não oferece publicar", async ({ page }) => {
  test.skip(!criados.cupom, "defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em erp/.env.local");
  await entrar(page);
  await page.goto("/ofertas/cupons");
  const linha = page.locator("li").filter({ hasText: `${marca} cupom` });
  await expect(linha).toBeVisible({ timeout: 60_000 });
  await expect(linha.getByText("Vencido", { exact: true })).toBeVisible();
  await expect(linha.getByRole("button", { name: "Publicar cupom" })).toHaveCount(0);
});

test("números mostram o estado do worker; grupo mostra visualizações como não disponível", async ({
  page,
}) => {
  test.skip(!criados.grupo, "defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em erp/.env.local");
  await entrar(page);
  await page.goto("/ofertas/numeros");
  await expect(page.getByRole("heading", { name: "Números de WhatsApp" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText(/Worker (no ar|sem sinal)/)).toBeVisible();
  await page.goto(`/ofertas/grupos/${criados.grupo}`);
  const vis = page.getByRole("region", { name: "Visualizações" });
  await expect(vis).toContainText("Sem dados");
  await expect(vis).toContainText("Não disponível pela integração");
  await expect(page.getByRole("region", { name: "Taxa de evasão" })).toContainText("Sem dados");
});

test("fila manual: cria, recebe link e a ativação mostra os problemas sem ativar", async ({
  page,
}) => {
  test.skip(!criados.grupo, "defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em erp/.env.local");
  await entrar(page);
  await page.goto("/ofertas/filas");
  await page.getByRole("button", { name: "Nova fila" }).click();
  await page.getByLabel("Nome da fila").fill(`${marca} fila`);
  await page.getByRole("button", { name: "Criar fila" }).click();
  await expect(page).toHaveURL(/\/ofertas\/filas\/[0-9a-f-]{36}/, { timeout: 30_000 });
  const filaId = page.url().split("/ofertas/filas/")[1].split("?")[0];
  await page
    .getByLabel("Colar links (um por linha, até 30)")
    .fill("https://produto.mercadolivre.com.br/MLB-5566778899-e2e");
  await page.getByRole("button", { name: "Incluir links" }).click();
  await expect(page.getByText(/1 oferta\(s\) na fila/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Ativar fila" }).click();
  await page.getByRole("button", { name: "Validar e ativar" }).click();
  await expect(page.getByText(/Nenhum grupo de destino ativo/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/não tem API de links/)).toBeVisible();
  const a = await servico();
  const { data: f } = await a!.from("ofe_filas").select("status").eq("id", filaId).single();
  expect(f?.status).toBe("rascunho");
  const { data: itens } = await a!
    .from("ofe_filas_itens")
    .select("oferta_id")
    .eq("fila_id", filaId);
  await a!.from("ofe_filas").delete().eq("id", filaId);
  for (const i of itens ?? [])
    if (i.oferta_id) await a!.from("ofe_ofertas").delete().eq("id", i.oferta_id);
});

test("copiador abre e explica o requisito de origem autorizada", async ({ page }) => {
  await entrar(page);
  await page.goto("/ofertas/copiador");
  await expect(page.getByRole("heading", { name: "Copiador" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/autorização para usar/)).toBeVisible();
});

test("relatórios separam envio, clique e venda; histórico abre com filtros", async ({ page }) => {
  await entrar(page);
  await page.goto("/ofertas/relatorios");
  await expect(page.getByRole("heading", { name: "Relatórios de ofertas" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByRole("heading", { name: /Mensagens publicadas pelo sistema/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Cliques reportados pelas plataformas/ }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /Vendas e comissões reportadas/ })).toBeVisible();
  const csv = await page.request.get("/ofertas/relatorios/exportar?tipo=envios");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  await page.goto("/ofertas/historico");
  await expect(page.getByRole("heading", { name: "Histórico de envios" })).toBeVisible({
    timeout: 60_000,
  });
  await page.goto("/ofertas");
  await expect(page.getByRole("region", { name: "Cliques reportados (30 dias)" })).toBeVisible();
});
