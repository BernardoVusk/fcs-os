/*
 * Teste de fumaça do servidor MCP por JSON-RPC puro, sem SDK.
 * uso: FCS_ERP_URL=http://localhost:3000 FCS_ERP_MCP_TOKEN=fcs_... node ferramentas/mcp-smoke.mjs [termo]
 * (lê também ../.env e ./.env.local)
 */
import { carregarEnv, exigirEnv } from "./env.mjs";

carregarEnv();
const url = `${process.env.FCS_ERP_URL ?? "http://localhost:3000"}/api/mcp`;
const token = exigirEnv("FCS_ERP_MCP_TOKEN");
const termo = process.argv[2] ?? "petg";
let id = 0;

async function chamar(method, params) {
  const corpo = { jsonrpc: "2.0", id: ++id, method, params };
  const resposta = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  if (!resposta.ok) throw new Error(`${method}: HTTP ${resposta.status} ${texto.slice(0, 300)}`);
  const tipo = resposta.headers.get("content-type") ?? "";
  if (tipo.includes("text/event-stream")) {
    const dados = texto
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => JSON.parse(l.slice(5).trim()));
    return dados.find((d) => d.id === corpo.id) ?? dados.at(-1);
  }
  return JSON.parse(texto);
}

const init = await chamar("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "fcs-smoke", version: "1" },
});
console.log("servidor:", init.result?.serverInfo, "| protocolo:", init.result?.protocolVersion);
const lista = await chamar("tools/list", {});
console.log("ferramentas:", lista.result?.tools?.map((t) => t.name).join(", "));
const busca = await chamar("tools/call", { name: "kb_buscar", arguments: { termo } });
console.log("kb_buscar:", busca.result?.content?.[0]?.text?.slice(0, 600) ?? busca.error);
const decisoes = await chamar("tools/call", { name: "kb_decisoes", arguments: {} });
console.log("kb_decisoes:", decisoes.result?.content?.[0]?.text?.slice(0, 300) ?? decisoes.error);
