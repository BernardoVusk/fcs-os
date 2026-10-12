import { z, type ZodError } from "zod";
import { lerNumeroPt, percentualParaFracao } from "@/lib/formatos/numero";

export type EstadoForm = { erros: Record<string, string>; ok?: boolean; mensagem?: string };
export const FORM_INICIAL: EstadoForm = { erros: {} };
export type ResultadoAcao = { ok: boolean; mensagem?: string; erro?: string };

/** Primeiro erro por campo; a mensagem é uma chave traduzida por erroPt(). */
export function errosDoZod(erro: ZodError): EstadoForm {
  const erros: Record<string, string> = {};
  for (const issue of erro.issues) {
    const campo = issue.path.map(String).join(".") || "_form";
    if (!(campo in erros)) erros[campo] = issue.message;
  }
  return { erros };
}

/** Lê campos de um FormData como strings aparadas (ausente vira ""). */
export function lerCampos<N extends string>(fd: FormData, nomes: readonly N[]): Record<N, string> {
  const saida = {} as Record<N, string>;
  for (const n of nomes) {
    const v = fd.get(n);
    saida[n] = typeof v === "string" ? v.trim() : "";
  }
  return saida;
}

const vazioParaNull = (f: (t: string) => number | null) => (v: unknown) => {
  if (v === "" || v == null) return null;
  const n = f(String(v));
  return n === null ? Number.NaN : n;
};

/** "14,5" (por cento) para 0.145; aceita 0 a 99,9999. */
export const campoFracao = z.preprocess(
  vazioParaNull(percentualParaFracao),
  z
    .number({ error: "percentual_invalido" })
    .min(0, { error: "percentual_invalido" })
    .lt(1, { error: "percentual_invalido" })
    .nullable(),
);
export const campoValor = z.preprocess(
  vazioParaNull(lerNumeroPt),
  z.number({ error: "numero_invalido" }).min(0, { error: "numero_invalido" }).nullable(),
);
export const campoInteiro = z.preprocess(
  vazioParaNull(lerNumeroPt),
  z
    .number({ error: "inteiro_invalido" })
    .int({ error: "inteiro_invalido" })
    .min(0, { error: "inteiro_invalido" })
    .nullable(),
);
export const textoOpcional = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.string().max(max).nullable());
