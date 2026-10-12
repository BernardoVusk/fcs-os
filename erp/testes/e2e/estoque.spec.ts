import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

// Limpa o que o teste criou, pela service role (o banco de dev é o real).
test.afterAll(async () => {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return;
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: insumos } = await admin.from("insumos").select("id").like("nome", "E2E %");
  const ids = (insumos ?? []).map((i) => i.id);
  if (ids.length) {
    const { data: lotes } = await admin.from("lotes_insumo").select("id").in("insumo_id", ids);
    await admin
      .from("alertas")
      .delete()
      .in("entidade_id", [...ids, ...(lotes ?? []).map((l) => l.id)]);
    await admin.from("movimentacoes_estoque").delete().in("insumo_id", ids);
    await admin.from("lotes_insumo").delete().in("insumo_id", ids);
  }
  await admin.from("compras").delete().like("numero_documento", "E2E-%");
  if (ids.length) await admin.from("insumos").delete().in("id", ids);
});

test("cadastra filamento, registra e confirma compra, consome e vê o saldo", async ({ page }) => {
  const marca = Date.now();
  const nome = `E2E PLA ${marca}`;
  await entrar(page);

  await page.goto("/estoque/insumos");
  await page.getByRole("button", { name: "Novo insumo" }).first().click();
  await page.getByLabel("Nome").fill(nome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Insumo cadastrado.")).toBeVisible();
  await page.waitForURL(/\/estoque\/insumos\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: nome })).toBeVisible();

  await page.goto("/estoque/compras/nova");
  await page.getByLabel("Insumo").selectOption({ label: nome });
  await page.getByLabel("Rolos").fill("2");
  await page.getByLabel("Preço por rolo").fill("95,00");
  await page.getByLabel("Frete (R$)").fill("30,00");
  await page.getByLabel("Documento ou pedido").fill(`E2E-${marca}`);
  await expect(page.getByText("R$ 220,00 na linha")).toBeVisible();
  await page.getByRole("button", { name: "Salvar como rascunho" }).click();
  await page.waitForURL(/\/estoque\/compras\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: `Compra E2E-${marca}` })).toBeVisible();

  await page.getByRole("button", { name: "Confirmar compra" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByText(/Compra confirmada: 2 lote/)).toBeVisible();
  await expect(page.getByText("Confirmada", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: nome }).first().click();
  await expect(page.getByRole("heading", { name: nome })).toBeVisible();
  await expect(page.getByText("2.000 g", { exact: true })).toBeVisible();
  await expect(page.getByText("R$ 110,00 /kg").first()).toBeVisible();

  await page.getByRole("button", { name: "Registrar movimentação" }).click();
  await page.getByLabel("Quantidade (g)").fill("350");
  await page.getByLabel("Motivo").fill("E2E consumo de teste");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page.getByText("Movimentação registrada.")).toBeVisible();
  await expect(page.getByText("1.650 g", { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Consumo de produção" })).toBeVisible();
});
