import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

test("sidebar recolhe, breadcrumb acompanha e tema persiste", async ({ page }) => {
  await entrar(page);
  await page.getByRole("link", { name: "Canais de venda" }).click();
  await expect(page.getByRole("heading", { name: "Canais de venda" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText("Canais de venda");
  await page.getByRole("button", { name: "Abrir ou recolher o menu" }).click();
  await expect(page.locator("[data-slot='sidebar'][data-state='collapsed']")).toBeVisible();
  await page.getByRole("button", { name: "Usar tema claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
  await page.getByRole("button", { name: "Usar tema escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-tema", "escuro");
});
