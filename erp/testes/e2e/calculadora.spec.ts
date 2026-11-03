import { expect, test, type Page } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

// Caso da planilha "Custo De Impressão" (docs/formulas-de-custo.md, Calculadora de marketplace):
// custo 10,44; Shopee com imposto 4 % e margem 30 % dá 32,49, ROAS mínimo 3,33 e ideal 5,00.
async function preencher(page: Page, rotulo: string, valor: string) {
  const campo = page.getByLabel(rotulo, { exact: true });
  await campo.fill("");
  await campo.fill(valor);
}

test("calculadora: custo da planilha, preço na Shopee e ROAS", async ({ page }) => {
  await entrar(page);
  await page.goto("/calculadora");
  await expect(page.getByRole("heading", { name: "Calculadora" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Limpar tudo" }).click();

  await preencher(page, "Tempo de impressão (horas)", "3");
  await preencher(page, "Material (gramas)", "104,58");
  await preencher(page, "Filamento (R$ por kg)", "57");
  await preencher(page, "Energia (R$ por hora)", "0,8");
  await preencher(page, "Extras (R$)", "0,2");
  const adicionar = page.getByLabel("Adicionar item de embalagem");
  await adicionar.selectOption("avulso");
  await adicionar.selectOption("avulso");
  await page.getByLabel("Custo por unidade").nth(0).fill("1,38");
  await page.getByLabel("Custo por unidade").nth(1).fill("0,5");
  await expect(page.getByTestId("custo-total")).toHaveText("R$ 10,44");

  await page.getByRole("button", { name: "Shopee" }).click();
  await preencher(page, "Imposto (%)", "4");
  await preencher(page, "Margem de lucro (%)", "30");
  await preencher(page, "Margem que quero manter depois do anúncio (%)", "10");
  await expect(page.getByTestId("preco-venda")).toHaveText("R$ 32,49");
  await expect(page.getByTestId("taxa-aplicada")).toHaveText("20 % + R$ 4,50 por item");
  await expect(page.getByTestId("roas-minimo")).toHaveText("3,33");
  await expect(page.getByTestId("roas-ideal")).toHaveText("5,00");

  // TikTok abaixo de R$ 50: 10 % + R$ 4. Mercado Livre pula a faixa de R$ 6,25 e fica na de R$ 6,50.
  await page.getByRole("button", { name: "TikTok Shop" }).click();
  await expect(page.getByTestId("preco-venda")).toHaveText("R$ 25,79");
  await page.getByRole("button", { name: "Mercado Livre Clássico" }).click();
  await expect(page.getByTestId("preco-venda")).toHaveText("R$ 32,58");
  await expect(page.getByTestId("taxa-aplicada")).toHaveText("14 % + R$ 6,50 por item");
});
