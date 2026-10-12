import { expect, type Page } from "@playwright/test";

export const CREDENCIAIS = {
  email: process.env.E2E_EMAIL ?? "",
  senha: process.env.E2E_SENHA ?? "",
};

export async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(CREDENCIAIS.email);
  await page.getByLabel("Senha").fill(CREDENCIAIS.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Primeira visita compila a rota no modo dev; dá folga.
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible({ timeout: 60_000 });
}
