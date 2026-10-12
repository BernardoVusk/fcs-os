import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

test("tema claro renderiza e gera capturas", async ({ page }) => {
  await entrar(page);
  await page.getByRole("button", { name: "Usar tema claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
  for (const rota of ["/", "/configuracoes/canais", "/login"]) {
    if (rota === "/login") {
      await page.goto("/perfil");
      await page.getByRole("button", { name: "Sair" }).click();
      await expect(page).toHaveURL(/\/login$/);
    } else {
      await page.goto(rota);
      await page.getByRole("heading", { level: 1 }).waitFor();
    }
    const nome = rota === "/" ? "inicio" : rota.replace(/\//g, "_").replace(/^_/, "");
    await page.screenshot({
      path: `testes/relatorios/capturas/claro-1440-${nome}.png`,
      fullPage: true,
    });
  }
});
