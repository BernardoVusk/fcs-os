import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

for (const largura of [1440, 1024, 390]) {
  test(`sem rolagem horizontal em ${largura}px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await entrar(page);
    for (const rota of ["/", "/configuracoes/canais", "/configuracoes/categorias"]) {
      await page.goto(rota);
      await page.getByRole("heading", { level: 1 }).waitFor();
      const estoura = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(estoura, `${rota} em ${largura}px`).toBe(false);
      const nome = rota === "/" ? "inicio" : rota.replace(/\//g, "_").replace(/^_/, "");
      await page.screenshot({
        path: `testes/relatorios/capturas/${largura}-${nome}.png`,
        fullPage: true,
      });
    }
  });
}
