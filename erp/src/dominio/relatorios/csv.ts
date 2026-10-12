/** CSV para Excel em português: BOM, ponto e vírgula, vírgula decimal e proteção contra injeção de fórmula. */

export type Celula = string | number | boolean | null | undefined;

/** Célula que começa com =, +, -, @, tab ou retorno vira texto (apóstrofo na frente). */
export function protegerFormula(texto: string): string {
  return /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
}

export function escaparCsv(valor: Celula): string {
  if (valor == null) return "";
  if (typeof valor === "number")
    return Number.isFinite(valor) ? String(valor).replace(".", ",") : "";
  if (typeof valor === "boolean") return valor ? "sim" : "nao";
  const limpo = protegerFormula(valor);
  return /[";\n\r]/.test(limpo) ? `"${limpo.replace(/"/g, '""')}"` : limpo;
}

/** Monta o arquivo inteiro: cabeçalho, linhas, CRLF, BOM. */
export function gerarCsv(
  cabecalho: readonly string[],
  linhas: readonly (readonly Celula[])[],
): string {
  const todas = [
    cabecalho.map(escaparCsv).join(";"),
    ...linhas.map((l) => l.map(escaparCsv).join(";")),
  ];
  return "﻿" + todas.join("\r\n");
}

/** Nome de arquivo seguro: só letras, números, hífen e ponto. */
export function nomeArquivo(base: string, extensao: string, data: string): string {
  const limpo = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${limpo || "exportacao"}-${data}.${extensao}`;
}
