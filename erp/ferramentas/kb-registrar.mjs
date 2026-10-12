/*
 * Registra conhecimentos a partir de um JSON, pelo servidor MCP (kb_salvar), como o
 * Claude Code faria. uso: node ferramentas/kb-registrar.mjs docs/conhecimento-inicial.json
 * Pula títulos que já existem (kb_buscar pelo título exato).
 */
import { readFileSync } from "node:fs";
import { carregarEnv, exigirEnv } from "./env.mjs";

carregarEnv();
const url = `${process.env.FCS_ERP_URL ?? "http://localhost:3000"}/api/mcp`;
const token = exigirEnv("FCS_ERP_MCP_TOKEN");
const arquivo = process.argv[2];
if (!arquivo) throw new Error("informe o JSON");
const registros = JSON.parse(readFileSync(arquivo, "utf8"));
let id = 0;

async function chamar(method, params) {
  const corpo = { jsonrpc: "2.0", id: ++id, method, params };
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(corpo),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${method}: HTTP ${r.status} ${texto.slice(0, 200)}`);
  const dados = texto
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => JSON.parse(l.slice(5).trim()));
  return dados.find((d) => d.id === corpo.id) ?? JSON.parse(texto);
}

async function ferramenta(nome, argumentos) {
  const r = await chamar("tools/call", { name: nome, arguments: argumentos });
  const conteudo = r.result?.content?.[0]?.text ?? JSON.stringify(r.error);
  if (r.result?.isError) throw new Error(`${nome}: ${conteudo}`);
  return JSON.parse(conteudo);
}

await chamar("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "kb-registrar", version: "1" },
});
for (const registro of registros) {
  const existentes = await ferramenta("kb_buscar", { termo: registro.titulo, limite: 5 });
  if (existentes.resultados.some((r) => r.titulo === registro.titulo)) {
    console.log("já existe:", registro.titulo);
    continue;
  }
  const salvo = await ferramenta("kb_salvar", registro);
  console.log("salvo:", registro.titulo, "->", salvo.rota);
}
