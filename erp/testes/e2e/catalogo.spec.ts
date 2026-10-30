import { expect, test } from "@playwright/test";

// Página pública /portfolio: abre sem login, navega até a categoria e o botão leva ao WhatsApp
// com a peça na mensagem.
const marca = Date.now();
const slug = `e2e-catalogo-${marca}`;
const nomeCategoria = `E2E Categoria ${marca}`;
const nomePeca = `Peça E2E & "Teste" ${marca}`;
let categoriaId = "";

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
  categoriaId = (
    await admin
      .from("catalogo_categorias")
      .insert({ slug, nome: nomeCategoria, ordem: 999 })
      .select("id")
      .single()
  ).data!.id;
  await admin
    .from("catalogo_itens")
    .insert({ categoria_id: categoriaId, nome: nomePeca, imagem: "e2e-inexistente.webp" });
});

test.afterAll(async () => {
  const admin = await servico();
  if (!admin || !categoriaId) return;
  await admin.from("catalogo_itens").delete().eq("categoria_id", categoriaId);
  await admin.from("catalogo_categorias").delete().eq("id", categoriaId);
});

test("catálogo abre sem login e o botão leva ao WhatsApp com a peça", async ({ page }) => {
  test.skip(!categoriaId, "defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em erp/.env.local");
  await page.goto("/portfolio");
  await expect(page).toHaveURL(/\/portfolio$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });

  await page
    .getByRole("link", { name: new RegExp(nomeCategoria) })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/portfolio/${slug}$`));
  await expect(page.getByRole("heading", { level: 1, name: nomeCategoria })).toBeVisible();
  await expect(page.getByRole("link", { name: nomeCategoria })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const card = page.getByRole("article").filter({ hasText: nomePeca });
  const href = await card.getByRole("link", { name: "Pedir orçamento" }).getAttribute("href");
  const url = new URL(href!);
  expect(url.origin + url.pathname).toBe("https://wa.me/5531992537279");
  expect(url.searchParams.get("text")).toBe(
    `Olá! Vi no catálogo da FCS 3D STUDIO a peça "${nomePeca}" (${nomeCategoria}) e quero um orçamento.`,
  );
});

test("categoria inexistente responde 404", async ({ page }) => {
  const resposta = await page.goto("/portfolio/nao-existe-categoria");
  expect(resposta?.status()).toBe(404);
});
