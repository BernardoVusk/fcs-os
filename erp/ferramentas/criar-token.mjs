/*
 * Cria um token de integração (MCP) para o primeiro dono, pela service role.
 * uso: node ferramentas/criar-token.mjs --nome="VS Code" [--escopos=conhecimento:ler,conhecimento:escrever,custos:ler,operacao:ler] [--dias=90] [--alvo=dev|teste]
 * Imprime o token UMA vez. Não grava em lugar nenhum.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { carregarEnv, exigirEnv } from "./env.mjs";

carregarEnv();
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  }),
);
const nome = args.nome ?? "Claude Code";
const escopos = (args.escopos ?? "conhecimento:ler,conhecimento:escrever,custos:ler,operacao:ler")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const dias = Number(args.dias ?? 90);
const prefixoEnv = (args.alvo ?? "dev") === "teste" ? "SUPABASE_TESTE_" : "SUPABASE_";
const admin = createClient(
  exigirEnv(`${prefixoEnv}URL`),
  exigirEnv(`${prefixoEnv}SERVICE_ROLE_KEY`),
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-origem": "script" } },
  },
);
const { data: dono, error: erroDono } = await admin
  .from("usuarios_app")
  .select("id, nome")
  .eq("papel", "dono")
  .eq("ativo", true)
  .order("criado_em")
  .limit(1)
  .maybeSingle();
if (erroDono) throw erroDono;
if (!dono) throw new Error("nenhum dono ativo em usuarios_app");
const token = `fcs_${randomBytes(32).toString("base64url")}`;
const { error } = await admin.from("tokens_integracao").insert({
  nome,
  hash_token: createHash("sha256").update(token).digest("hex"),
  prefixo: token.slice(0, 12),
  usuario_id: dono.id,
  escopos,
  expira_em: dias > 0 ? new Date(Date.now() + dias * 86_400_000).toISOString() : null,
});
if (error) throw error;
console.log(
  `token criado para ${dono.nome} (${escopos.join(", ")}), validade ${dias > 0 ? dias + " dias" : "sem"}`,
);
console.log(token);
