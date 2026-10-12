import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

// Upload direto ao Storage: um STL de 6 MB (acima do limite de 4,5 MB da Vercel) sobe pelo navegador
// por URL assinada e a action só registra o metadado; o arquivo abre por URL assinada.
const marca = Date.now();
let produtoId = "";

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
  produtoId = (
    await admin
      .from("produtos")
      .insert({ nome: `E2E arquivo ${marca}`, status: "rascunho" })
      .select("id")
      .single()
  ).data!.id;
});

test.afterAll(async () => {
  const admin = await servico();
  if (!admin || !produtoId) return;
  const { data: objetos } = await admin.storage.from("arquivos-produto").list(produtoId);
  if (objetos?.length)
    await admin.storage
      .from("arquivos-produto")
      .remove(objetos.map((o) => `${produtoId}/${o.name}`));
  await admin.from("produtos_arquivos").delete().eq("produto_id", produtoId);
  await admin.from("produtos").delete().eq("id", produtoId);
});

test("envia um STL de 6 MB direto ao Storage e registra com hash", async ({ page }) => {
  await entrar(page);
  await page.goto(`/catalogo/produtos/${produtoId}`);
  await expect(page.getByRole("heading", { name: `E2E arquivo ${marca}` })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole("tab", { name: /Arquivos/ }).click();
  await page.getByRole("button", { name: "Novo arquivo" }).click();
  await expect(page.getByRole("heading", { name: "Arquivo do produto" })).toBeVisible();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Tipo").selectOption("stl");
  await dialogo.locator('input[name="arquivo"]').setInputFiles({
    name: `peca-${marca}.stl`,
    mimeType: "application/octet-stream",
    buffer: Buffer.alloc(6 * 1024 * 1024, 7),
  });
  await dialogo.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Arquivo enviado.")).toBeVisible({ timeout: 120_000 });
  const linha = page.getByRole("row", { name: new RegExp(`peca-${marca}\\.stl`) });
  await expect(linha).toBeVisible();
  await expect(linha.getByText(/6[,.]0/)).toBeVisible();

  const admin = await servico();
  if (admin) {
    const { data } = await admin
      .from("produtos_arquivos")
      .select("bucket, storage_path, tamanho, hash_sha256")
      .eq("produto_id", produtoId)
      .single();
    expect(data!.bucket).toBe("arquivos-produto");
    expect(data!.storage_path.startsWith(`${produtoId}/`)).toBe(true);
    expect(Number(data!.tamanho)).toBe(6 * 1024 * 1024);
    expect(data!.hash_sha256).toMatch(/^[0-9a-f]{64}$/);
  }
});

test("recusa extensão que não bate com o tipo antes de enviar", async ({ page }) => {
  await entrar(page);
  await page.goto(`/catalogo/produtos/${produtoId}`);
  await page.getByRole("tab", { name: /Arquivos/ }).click();
  await page.getByRole("button", { name: "Novo arquivo" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Tipo").selectOption("stl");
  await dialogo.locator('input[name="arquivo"]').setInputFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(1024, 1),
  });
  await dialogo.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText(/Tipo de arquivo não aceito/)).toBeVisible({ timeout: 60_000 });
});
