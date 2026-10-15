import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

// Página pública /sorteio: abre sem login, grava a inscrição e mostra o link do grupo.
const marca = Date.now();
const emailCliente = `e2e-sorteio-${marca}@exemplo.com`;
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
  produtoId = (
    await admin
      .from("produtos")
      .insert({ nome: `E2E Produto sorteio ${marca}`, status: "ativo" })
      .select("id")
      .single()
  ).data!.id;
});

test.afterAll(async () => {
  const admin = await servico();
  if (!admin) return;
  const { data: clientes } = await admin.from("clientes").select("id").eq("email", emailCliente);
  for (const c of clientes ?? []) {
    await admin.from("inscricoes_sorteio").delete().eq("cliente_id", c.id);
    await admin.from("clientes").delete().eq("id", c.id);
  }
  if (produtoId) await admin.from("produtos").delete().eq("id", produtoId);
});

test("página pública abre sem login e grava a inscrição", async ({ page }) => {
  test.skip(!produtoId, "defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em erp/.env.local");
  // O redirect para o grupo não deve sair da página durante o teste.
  await page.route("https://chat.whatsapp.com/**", (r) => r.fulfill({ body: "ok" }));
  await page.goto("/sorteio");
  await expect(page).toHaveURL(/\/sorteio$/);
  await expect(page.getByRole("heading", { name: /Obrigado por comprar/ })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByLabel("Nome").fill("Cliente E2E");
  await page.getByLabel("E-mail").fill(emailCliente);
  await page.getByLabel("WhatsApp").fill("(31) 99999-0000");
  await page.getByRole("radio", { name: "Shopee" }).check();
  await page.getByLabel("Qual produto você comprou").selectOption(produtoId);
  await page.getByRole("checkbox", { name: /Aceito receber mensagens/ }).check();
  await page.getByRole("button", { name: "Cadastrar e entrar no grupo" }).click();
  await expect(page.getByText("Cadastro feito")).toBeVisible();
  await expect(page.getByRole("link", { name: /Entrar no grupo do WhatsApp/ })).toBeVisible();

  const admin = await servico();
  const { data } = await admin!
    .from("clientes")
    .select("nome, telefone")
    .eq("email", emailCliente)
    .single();
  expect(data).toEqual({ nome: "Cliente E2E", telefone: "31999990000" });
});

test("campos vazios mostram os erros sem gravar", async ({ page }) => {
  await page.goto("/sorteio");
  await page.getByRole("button", { name: "Cadastrar e entrar no grupo" }).click();
  await expect(page.getByText("Informe o nome.")).toBeVisible();
  await expect(page.getByText("Marque a autorização para participar.")).toBeVisible();
});

test("tela interna lista a inscrição, exporta CSV e mostra o botão de sortear", async ({
  page,
}) => {
  test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");
  test.skip(!produtoId, "defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em erp/.env.local");
  await entrar(page);
  await page.goto("/vendas/sorteio");
  await expect(page.getByRole("heading", { name: "Sorteio" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("cell", { name: emailCliente })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^sorteio-\d{4}-\d{2}-.*\.csv$/);
  // Nunca clicar: o banco de dev é o de produção; o sorteio é coberto pelo teste de integração.
  await expect(page.getByRole("button", { name: "Sortear ganhador do mês" })).toBeVisible();
});
