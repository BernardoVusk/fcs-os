import { exigirEnv } from "./env.mjs";

const BASE = "https://api.supabase.com/v1";

async function chamar(metodo, caminho, corpo) {
  const resposta = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${exigirEnv("SUPABASE_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = texto;
  }
  if (!resposta.ok) {
    const msg = dados && typeof dados === "object" && "message" in dados ? dados.message : texto;
    throw new Error(`Management API ${metodo} ${caminho}: ${resposta.status} ${msg}`);
  }
  return dados;
}

/** Executa SQL no projeto. Lança erro com a mensagem do Postgres. */
export async function consultar(ref, sql) {
  const dados = await chamar("POST", `/projects/${ref}/database/query`, { query: sql });
  if (dados && typeof dados === "object" && !Array.isArray(dados) && "message" in dados) {
    throw new Error(dados.message);
  }
  return dados;
}

export const api = {
  get: (caminho) => chamar("GET", caminho),
  post: (caminho, corpo) => chamar("POST", caminho, corpo),
};
