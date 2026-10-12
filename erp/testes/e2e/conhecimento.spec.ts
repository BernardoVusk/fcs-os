import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

test.afterAll(async () => {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return;
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await admin.from("conhecimentos").delete().like("titulo", "E2E conhecimento %");
});

test("cria, abre, edita (versão 2), acha na busca e valida", async ({ page }) => {
  const titulo = `E2E conhecimento ${Date.now()}`;
  await entrar(page);
  await page.goto("/conhecimento");
  await page.getByRole("link", { name: "Novo conhecimento" }).first().click();
  await page.getByLabel("Título").fill(titulo);
  await page.getByLabel("Resumo").fill("Resumo do teste automatizado.");
  await page.getByLabel("Conteúdo").fill("## Passos\n\n1. Secar o PETG.\n2. Mesa a 85 graus.");
  await page.getByLabel("Tipo").selectOption("procedimento");
  await page.getByLabel("Tags").fill("e2e, petg");
  await page.getByRole("button", { name: "Criar conhecimento" }).click();
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
  await expect(page.getByText("Secar o PETG.")).toBeVisible();

  await page.getByRole("link", { name: "Editar" }).click();
  await page
    .getByLabel("Conteúdo")
    .fill("## Passos\n\n1. Secar o PETG por 6 horas.\n2. Mesa a 85 graus.");
  await page.getByLabel("Motivo da alteração").fill("tempo de secagem");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Secar o PETG por 6 horas.")).toBeVisible();
  await expect(page.getByText("Versão 2")).toBeVisible();
  await expect(page.getByText("tempo de secagem")).toBeVisible();

  await page.getByRole("button", { name: "Marcar validado" }).click();
  await expect(page.getByText("Marcado como validado.")).toBeVisible();

  await page.keyboard.press("Control+k");
  await page
    .getByPlaceholder("Buscar insumo, lote, compra, conhecimento...")
    .fill("e2e conhecimento");
  await expect(page.getByRole("option", { name: new RegExp(titulo) })).toBeVisible();
  await page.keyboard.press("Escape");

  // Busca por texto completo usa radicais: "petg" está nas tags e no conteúdo.
  await page.goto("/conhecimento?q=petg");
  await expect(page.getByRole("link", { name: new RegExp(titulo) })).toBeVisible();
});
