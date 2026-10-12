/**
 * Leitura do catálogo unificado (`dados/catalogo/*.csv`): um anúncio por linha, chave (canal, id).
 * Parser próprio (RFC 4180: aspas, vírgula dentro de aspas, aspas duplicadas, quebra de linha dentro de aspas).
 */

export type LinhaCatalogo = {
  canal: string;
  codigo_externo: string;
  titulo: string;
  preco: number | null;
  estoque: number | null;
  vendas_total: number | null;
  vendas_periodo: number | null;
  visitas_periodo: number | null;
  conversao: number | null;
  nota: number | null;
  avaliacoes: number | null;
  fotos: number | null;
  categoria_externa: string | null;
  coletado_em: string | null;
};

export type ResultadoLeitura = {
  linhas: LinhaCatalogo[];
  /** Linhas puladas, com o número (1 = primeira após o cabeçalho) e o motivo. */
  ignoradas: { linha: number; motivo: string }[];
  colunas: string[];
};

const OBRIGATORIAS = ["canal", "id", "titulo"] as const;

export function separarCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  const t = texto.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          campo += '"';
          i++;
        } else aspas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') aspas = true;
    else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo);
      campo = "";
      if (linha.some((v) => v !== "")) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    if (linha.some((v) => v !== "")) linhas.push(linha);
  }
  return linhas;
}

const numero = (v: string | undefined): number | null => {
  if (v == null) return null;
  const s = v.trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const inteiro = (v: string | undefined): number | null => {
  const n = numero(v);
  return n == null ? null : Math.trunc(n);
};
const texto = (v: string | undefined): string | null => {
  const s = (v ?? "").trim();
  return s ? s : null;
};

export function lerCatalogo(csv: string): ResultadoLeitura {
  const matriz = separarCsv(csv);
  if (matriz.length === 0) return { linhas: [], ignoradas: [], colunas: [] };
  const colunas = matriz[0].map((c) => c.trim().toLowerCase());
  const idx = (nome: string) => colunas.indexOf(nome);
  const faltando = OBRIGATORIAS.filter((c) => idx(c) < 0);
  if (faltando.length > 0) throw new Error(`csv_sem_colunas:${faltando.join(",")}`);
  const linhas: LinhaCatalogo[] = [];
  const ignoradas: ResultadoLeitura["ignoradas"] = [];
  const vistos = new Set<string>();
  for (let n = 1; n < matriz.length; n++) {
    const r = matriz[n];
    const pegar = (nome: string) => (idx(nome) >= 0 ? r[idx(nome)] : undefined);
    const canal = (pegar("canal") ?? "").trim().toLowerCase();
    const codigo = (pegar("id") ?? "").trim();
    const titulo = (pegar("titulo") ?? "").trim();
    if (!canal || !codigo) {
      ignoradas.push({ linha: n, motivo: "sem canal ou id" });
      continue;
    }
    if (!titulo) {
      ignoradas.push({ linha: n, motivo: "sem título" });
      continue;
    }
    const chave = `${canal}:${codigo}`;
    if (vistos.has(chave)) {
      ignoradas.push({ linha: n, motivo: "repetida no arquivo" });
      continue;
    }
    vistos.add(chave);
    linhas.push({
      canal,
      codigo_externo: codigo,
      titulo,
      preco: numero(pegar("preco")),
      estoque: inteiro(pegar("estoque")),
      vendas_total: inteiro(pegar("vendas_total")),
      vendas_periodo: inteiro(pegar("vendas_periodo")),
      visitas_periodo: inteiro(pegar("visitas_periodo")),
      conversao: numero(pegar("conversao")),
      nota: numero(pegar("nota")),
      avaliacoes: inteiro(pegar("avaliacoes")),
      fotos: inteiro(pegar("fotos")),
      categoria_externa: texto(pegar("categoria")),
      coletado_em: texto(pegar("coletado_em")),
    });
  }
  return { linhas, ignoradas, colunas };
}

/** Nome de produto sugerido a partir do título do anúncio: corta no primeiro separador e limita o tamanho. */
export function nomeSugerido(titulo: string): string {
  const base = titulo.split(/[,|]|\s[-–]\s/)[0].trim();
  return (base || titulo).slice(0, 120);
}
