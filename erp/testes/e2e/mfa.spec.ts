import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

// Verificação em duas etapas: ativa no perfil com o segredo, o login passa a pedir o código, desativa com o código.
// Roda em série e sempre remove o fator no fim, senão os outros testes não conseguem entrar.
test.describe.configure({ mode: "serial" });

function base32ParaBytes(segredo: string): Buffer {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of segredo.replace(/=+$/, "").toUpperCase()) {
    const v = alfabeto.indexOf(ch);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

/** TOTP padrão (SHA1, 6 dígitos, 30 s), igual ao do aplicativo autenticador. */
function totp(segredo: string, agora = Date.now()): string {
  const contador = Math.floor(agora / 1000 / 30);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(contador));
  const h = createHmac("sha1", base32ParaBytes(segredo)).update(msg).digest();
  const offset = h[h.length - 1] & 0x0f;
  const codigo =
    ((h[offset] & 0x7f) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(codigo % 1_000_000).padStart(6, "0");
}

async function servico() {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function removerFatores() {
  const admin = await servico();
  if (!admin) return;
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const usuario = data?.users.find((u) => u.email === CREDENCIAIS.email);
  if (!usuario) return;
  const { data: fatores } = await admin.auth.admin.mfa.listFactors({ userId: usuario.id });
  for (const f of fatores?.factors ?? [])
    await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: usuario.id });
}

test.beforeAll(removerFatores);
test.afterAll(removerFatores);

test("ativa a verificação, o login pede o código e desativa com o código", async ({ page }) => {
  await entrar(page);
  await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Ativar verificação em duas etapas" }).click();
  const segredo = (await page.getByLabel("Segredo").textContent({ timeout: 60_000 }))?.trim() ?? "";
  expect(segredo.length).toBeGreaterThan(10);
  await page.getByLabel("Código do aplicativo").fill(totp(segredo));
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Verificação em duas etapas ativada.")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("Ativa", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL(/\/login$/, { timeout: 60_000 });
  await page.getByLabel("E-mail").fill(CREDENCIAIS.email);
  await page.getByLabel("Senha").fill(CREDENCIAIS.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/login\/verificar/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Verificação em duas etapas" })).toBeVisible();
  await page.goto("/financeiro");
  await expect(page).toHaveURL(/\/login\/verificar/);
  await page.getByLabel("Código").fill("000000");
  await page.getByRole("button", { name: "Verificar" }).click();
  await expect(page.getByText(/Código inválido/)).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Código").fill(totp(segredo));
  await page.getByRole("button", { name: "Verificar" }).click();
  await page.waitForURL((u) => u.pathname === "/financeiro" || u.pathname === "/", {
    timeout: 60_000,
  });

  await page.goto("/perfil");
  await page.getByLabel("Código atual para desativar").fill(totp(segredo));
  await page.getByRole("button", { name: "Desativar" }).click();
  await expect(page.getByText("Verificação em duas etapas desativada.")).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByRole("button", { name: "Ativar verificação em duas etapas" }),
  ).toBeVisible();
});
