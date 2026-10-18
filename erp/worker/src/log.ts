import { contemSegredo } from "@/dominio/conhecimento/segredos";
import { redigir } from "@/integracoes/segredo";

/**
 * Log estruturado do worker (uma linha JSON por evento, lido pelo `fly logs`). Nunca registra
 * QR, código de pareamento, estado de sessão, token ou corpo de resposta: só o que está aqui.
 */

const segredosConhecidos: string[] = [];

export function registrarSegredo(...valores: (string | null | undefined)[]) {
  for (const v of valores)
    if (v && v.length >= 6 && !segredosConhecidos.includes(v)) segredosConhecidos.push(v);
}

function limpar(texto: string): string {
  const r = redigir(texto, segredosConhecidos);
  return contemSegredo(r).achou ? "[conteúdo com aparência de segredo omitido]" : r.slice(0, 500);
}

type Nivel = "info" | "aviso" | "erro";

export function log(
  nivel: Nivel,
  evento: string,
  dados: Record<string, string | number | boolean | null | undefined> = {},
) {
  const linha: Record<string, unknown> = { em: new Date().toISOString(), nivel, evento };
  for (const [k, v] of Object.entries(dados)) linha[k] = typeof v === "string" ? limpar(v) : v;
  const saida = JSON.stringify(linha);
  if (nivel === "erro") console.error(saida);
  else console.log(saida);
}

export function mensagemDeErro(e: unknown): string {
  return limpar(e instanceof Error ? e.message : String(e));
}

/** Logger exigido pela Baileys: silencioso, só repassa erro sem o objeto (que pode ter chave). */
export type LoggerBaileys = {
  level: string;
  child(obj: Record<string, unknown>): LoggerBaileys;
  trace(obj: unknown, msg?: string): void;
  debug(obj: unknown, msg?: string): void;
  info(obj: unknown, msg?: string): void;
  warn(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
};

export function loggerSilencioso(numero: string): LoggerBaileys {
  const nada = () => {};
  const l: LoggerBaileys = {
    level: "error",
    child: () => l,
    trace: nada,
    debug: nada,
    info: nada,
    warn: nada,
    error: (_obj, msg) =>
      log("erro", "baileys", { numero, msg: msg ?? "erro interno da biblioteca" }),
  };
  return l;
}
