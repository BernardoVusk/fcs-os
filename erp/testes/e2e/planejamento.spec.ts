import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

// Tarefa criada pelo diálogo aparece no calendário, muda de status no drawer e no quadro;
// conteúdo criado pelo formulário completo nasce com o checklist do formato.
const marca = Date.now();

async function servico() {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

test.afterAll(async () => {
  const admin = await servico();
  if (!admin) return;
  await admin.from("plan_itens").delete().like("titulo", `%E2E ${marca}%`);
});

test("cria tarefa no calendário, muda status no drawer e move no quadro", async ({ page }) => {
  await entrar(page);
  await page.goto("/planejamento");
  await expect(page.getByRole("heading", { name: "Calendário" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Novo item" }).click();
  await page.getByLabel("Título").fill(`Separar pedidos E2E ${marca}`);
  await page.getByRole("button", { name: "Criar", exact: true }).click();
  await expect(page.getByText("Item criado.")).toBeVisible({ timeout: 60_000 });

  const chip = page.getByRole("link", { name: new RegExp(`Separar pedidos E2E ${marca}`) }).first();
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page.getByRole("heading", { name: `Separar pedidos E2E ${marca}` })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByLabel("Status").selectOption("em_andamento");
  await expect(page.getByText("Status alterado.")).toBeVisible({ timeout: 60_000 });

  await page.goto("/planejamento/quadro?tipo=tarefa");
  await expect(page.getByRole("heading", { name: /Quadro de tarefas/ })).toBeVisible({
    timeout: 60_000,
  });
  const andamento = page.getByRole("region", { name: "Em andamento" });
  await expect(andamento.getByRole("link", { name: `Separar pedidos E2E ${marca}` })).toBeVisible();
  await andamento.getByLabel(`Mover Separar pedidos E2E ${marca} para`).selectOption("concluida");
  const concluida = page.getByRole("region", { name: "Concluída" });
  await expect(concluida.getByRole("link", { name: `Separar pedidos E2E ${marca}` })).toBeVisible({
    timeout: 60_000,
  });

  await page.goto("/planejamento/lista?rapido=todos");
  const linha = page.getByRole("row", { name: new RegExp(`Separar pedidos E2E ${marca}`) });
  await expect(linha).toBeVisible({ timeout: 60_000 });
  await expect(linha.getByText("Concluída")).toBeVisible();
});

test("conteúdo criado pelo formulário completo nasce com o checklist do formato", async ({
  page,
}) => {
  await entrar(page);
  await page.goto("/planejamento/itens/novo?tipo=conteudo");
  await expect(page.getByRole("heading", { name: "Novo item" })).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Título").fill(`Carrossel F1 E2E ${marca}`);
  await page.getByLabel("Formato").selectOption("carrossel");
  await expect(page.getByLabel("Canal de publicação")).toHaveValue("instagram");
  await page.getByLabel("Briefing").fill("Mostrar o kit de miniaturas F1 com foco no acabamento.");
  await page.getByRole("button", { name: "Criar item" }).click();
  await page.waitForURL(/\/planejamento\/itens\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: `Carrossel F1 E2E ${marca}` })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByLabel("Pauta")).toBeVisible();
  await expect(page.getByLabel("Render PNG")).toBeVisible();
  await page.getByLabel("Pauta").check();
  await expect(page.getByText("14%")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("/carrossel", { exact: false }).first()).toBeVisible();
});
