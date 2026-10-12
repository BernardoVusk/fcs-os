import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

// Lançamento a pagar de 150: paga 100 (parcial), paga o resto (realizado), caixa e painel refletem.
const marca = Date.now();
let contaId = "";

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
  contaId = (
    await admin
      .from("contas_financeiras")
      .insert({
        nome: `E2E Conta ${marca}`,
        tipo: "banco",
        saldo_inicial: 500,
        saldo_inicial_em: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single()
  ).data!.id;
});

test.afterAll(async () => {
  const admin = await servico();
  if (!admin) return;
  const { data: lancs } = await admin
    .from("lancamentos")
    .select("id")
    .like("descricao", `%E2E ${marca}%`);
  const ids = (lancs ?? []).map((l) => l.id);
  if (ids.length) {
    await admin.from("lancamentos_realizacoes").delete().in("lancamento_id", ids);
    await admin.from("lancamentos").delete().in("id", ids);
  }
  if (contaId) await admin.from("contas_financeiras").delete().eq("id", contaId);
});

test("registra um pagável, paga em duas vezes e vê o caixa no painel", async ({ page }) => {
  await entrar(page);
  await page.goto("/financeiro/lancamentos?novo=1");
  await expect(page.getByRole("heading", { name: "Novo lançamento" })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByLabel("Valor (R$)").fill("150");
  await page.getByLabel("Descrição").fill(`Conta de luz E2E ${marca}`);
  await page.getByLabel("Conta", { exact: true }).selectOption({ label: `E2E Conta ${marca}` });
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page.getByText("Lançamento planejado.")).toBeVisible({ timeout: 60_000 });

  const linha = page.getByRole("row", { name: new RegExp(`Conta de luz E2E ${marca}`) });
  await expect(linha).toBeVisible();
  await expect(linha.getByText("Planejado")).toBeVisible();
  await expect(linha.getByText("R$ 150,00")).toBeVisible();

  await linha.getByRole("button", { name: "Pagar" }).click();
  await expect(page.getByRole("heading", { name: "Registrar pagamento" })).toBeVisible();
  await page.getByLabel("Valor (R$)").fill("100");
  await page.getByRole("button", { name: "Registrar pagamento" }).click();
  await expect(page.getByText("Parcial").first()).toBeVisible({ timeout: 60_000 });
  await expect(linha.getByText("restam R$ 50,00")).toBeVisible();

  await linha.getByRole("button", { name: "Pagar" }).click();
  await expect(page.getByLabel("Valor (R$)")).toHaveValue("50");
  await page.getByRole("button", { name: "Registrar pagamento" }).click();
  await expect(page.getByText("Realizado").first()).toBeVisible({ timeout: 60_000 });
  await expect(linha.getByRole("button", { name: "Pagar" })).toHaveCount(0);
  await expect(linha.getByRole("button", { name: "Estornar" })).toBeVisible();

  await page.goto("/financeiro");
  await expect(page.getByRole("heading", { name: "Financeiro", exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("Caixa realizado hoje")).toBeVisible();
  const tabelaContas = page.getByRole("row", { name: new RegExp(`E2E Conta ${marca}`) });
  await expect(tabelaContas.getByText("R$ 350,00")).toBeVisible();
  await expect(page.getByText("DRE gerencial de")).toBeVisible();
});

test("contas: cadastra pela tela e aparece com o saldo inicial", async ({ page }) => {
  await entrar(page);
  await page.goto("/financeiro/contas?novo=1");
  await expect(page.getByRole("heading", { name: "Nova conta" })).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Nome").fill(`E2E Carteira ${marca}`);
  await page.getByLabel("Tipo").selectOption("carteira");
  await page.getByLabel("Saldo inicial (R$)").fill("25,50");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Conta salva.")).toBeVisible({ timeout: 60_000 });
  const linha = page.getByRole("row", { name: new RegExp(`E2E Carteira ${marca}`) });
  await expect(linha.getByText("R$ 25,50").first()).toBeVisible();
  const admin = await servico();
  if (admin) await admin.from("contas_financeiras").delete().like("nome", `E2E Carteira ${marca}`);
});
