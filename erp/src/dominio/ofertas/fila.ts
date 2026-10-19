import { hostNaLista, HOSTS_PLATAFORMA } from "./plataformas";

/**
 * Regras puras da fila: prévia do lote (quantas mensagens, quando termina) e leitura do CSV de
 * links em massa da Shopee (portal: Oferta de Produto > Obter Link). Só a coluna de link é
 * documentada pela Shopee; nome e preço entram quando a coluna existir no arquivo.
 */

export type PreviaLote = {
  itens: number;
  grupos: number;
  mensagens: number;
  terminaEm: Date | null;
  dias: number;
};

/**
 * Uma publicação por item, cada uma para todos os grupos, com `intervalo` entre publicações e só
 * dentro da janela diária (HH:MM de São Paulo, sem passar da meia-noite). Estimativa: o envio real
 * depende do número conectado e dos limites dele.
 */
export function previaLote(p: {
  itens: number;
  grupos: number;
  intervaloSegundos: number;
  janela: { inicio: string; fim: string };
  inicio: Date;
}): PreviaLote {
  const mensagens = p.itens * p.grupos;
  if (p.itens === 0 || p.grupos === 0)
    return { itens: p.itens, grupos: p.grupos, mensagens, terminaEm: null, dias: 0 };
  const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const janelaMin = Math.max(1, min(p.janela.fim) - min(p.janela.inicio));
  const porDia = Math.max(1, Math.floor((janelaMin * 60) / p.intervaloSegundos) + 1);
  const dias = Math.ceil(p.itens / porDia);
  const restantes = p.itens - 1;
  const terminaEm =
    dias <= 1 ? new Date(p.inicio.getTime() + restantes * p.intervaloSegundos * 1000) : null;
  return { itens: p.itens, grupos: p.grupos, mensagens, terminaEm, dias };
}

/** Separa CSV com vírgula ou ponto e vírgula (detecta pela primeira linha), com aspas. */
export function separar(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const primeira = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = (primeira.match(/;/g)?.length ?? 0) > (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
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
    else if (c === sep) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo);
      campo = "";
      if (linha.some((v) => v.trim() !== "")) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo !== "" || linha.length) {
    linha.push(campo);
    if (linha.some((v) => v.trim() !== "")) linhas.push(linha);
  }
  return linhas;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export type LinhaCsvShopee = {
  linha: number;
  link: string;
  nome: string | null;
  preco: string | null;
  urlProduto: string | null;
};
export type LeituraCsvShopee =
  | {
      ok: true;
      linhas: LinhaCsvShopee[];
      ignoradas: { linha: number; motivo: string }[];
      colunas: string[];
    }
  | { ok: false; erro: "csv_vazio" | "csv_sem_coluna_link" | "csv_grande"; colunas: string[] };

export const LIMITE_CSV = 500;

export function lerCsvShopee(texto: string): LeituraCsvShopee {
  const m = separar(texto);
  if (m.length < 2) return { ok: false, erro: "csv_vazio", colunas: m[0] ?? [] };
  const colunas = m[0].map((c) => c.trim());
  const n = colunas.map(norm);
  const achar = (...padroes: RegExp[]) => {
    for (const p of padroes) {
      const i = n.findIndex((c) => p.test(c));
      if (i >= 0) return i;
    }
    return -1;
  };
  const iLink = achar(
    /^offer link$/,
    /link da oferta|link de oferta|affiliate link|link de afiliado/,
    /^link$/,
  );
  if (iLink < 0) return { ok: false, erro: "csv_sem_coluna_link", colunas };
  if (m.length - 1 > LIMITE_CSV) return { ok: false, erro: "csv_grande", colunas };
  const iNome = achar(/product name|item name|nome do produto/, /^nome$/);
  const iPreco = achar(/^price$|^preco$/, /price|preco/);
  const iProduto = achar(/product link|item link|link do produto/);
  const linhas: LinhaCsvShopee[] = [];
  const ignoradas: { linha: number; motivo: string }[] = [];
  const vistos = new Set<string>();
  for (let k = 1; k < m.length; k++) {
    const r = m[k];
    const link = (r[iLink] ?? "").trim();
    let host = "";
    try {
      const u = new URL(link);
      host = u.protocol === "https:" ? u.hostname : "";
    } catch {
      host = "";
    }
    if (!host || !hostNaLista(host, HOSTS_PLATAFORMA.shopee)) {
      ignoradas.push({ linha: k, motivo: "link ausente ou não é da Shopee" });
      continue;
    }
    if (vistos.has(link)) {
      ignoradas.push({ linha: k, motivo: "link repetido no arquivo" });
      continue;
    }
    vistos.add(link);
    const produto = iProduto >= 0 ? (r[iProduto] ?? "").trim() : "";
    linhas.push({
      linha: k,
      link,
      nome: iNome >= 0 ? (r[iNome] ?? "").trim().slice(0, 300) || null : null,
      preco: iPreco >= 0 ? (r[iPreco] ?? "").trim() || null : null,
      urlProduto: /^https:\/\//.test(produto) ? produto : null,
    });
  }
  return { ok: true, linhas, ignoradas, colunas };
}

/** Lista de links colados (um por linha ou separados por espaço), sem repetir. */
export function linksColados(texto: string): string[] {
  const achados = texto.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  return [...new Set(achados.map((u) => u.replace(/[.,;)]+$/, "")))].slice(0, 100);
}
