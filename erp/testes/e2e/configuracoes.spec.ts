import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

// Limpa o que o teste criou, pela service role (o banco de dev é o real).
test.afterAll(async () => {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return;
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  await admin.from("categorias").delete().like("nome", "E2E %");
});

test("cria categoria, encontra na busca e inativa", async ({ page }) => {
  const nome = `E2E ${Date.now()}`;
  await entrar(page);
  await page.goto("/configuracoes/categorias?escopo=produto");
  await page.getByRole("button", { name: "Nova categoria" }).click();
  await page.getByLabel("Nome").fill(nome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Categoria salva.")).toBeVisible();
  await expect(page.getByRole("cell", { name: nome })).toBeVisible();

  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Buscar canal, categoria, unidade...").fill(nome.toLowerCase());
  const opcao = page.getByRole("option", { name: new RegExp(nome) });
  await expect(opcao).toBeVisible();
  await opcao.click();
  await expect(page).toHaveURL(/escopo=produto&destaque=/);

  const linha = page.getByRole("row", { name: new RegExp(nome) });
  await linha.getByRole("button", { name: "Inativar" }).click();
  await expect(page.getByText("Categoria inativada.")).toBeVisible();
  await expect(linha.getByText("Inativa")).toBeVisible();
});
