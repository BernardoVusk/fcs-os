/**
 * Leitura de relatórios exportados dos portais de afiliado (Shopee, Mercado Livre, Amazon, Awin).
 * Os formatos mudam e não são documentados por todas as plataformas, então o usuário aponta qual
 * coluna é qual; o sistema só lê o que foi apontado e não completa nada que faltar.
 */

export type MapaConversoes = {
  ref: string;
  data: string;
  status?: string;
  venda?: string;
  comissao?: string;
  codigo?: string;
};
export type MapaCliques = { data: string; codigo: string; cliques: string };

export type LinhaConversao = {
  ref: string;
  data: string;
  status: string | null;
  venda: string | null;
  comissao: string | null;
  codigos: string[];
};

/** Datas comuns dos portais: ISO, dd/mm/aaaa e dd/mm/aaaa hh:mm(:ss); horário de São Paulo. */
export function lerDataRelatorio(v: string): string | null {
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(t)) {
    const d = Date.parse(t);
    return Number.isNaN(d) ? null : new Date(d).toISOString();
  }
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ ,]+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  const p = iso
    ? [iso[1], iso[2], iso[3], iso[4], iso[5], iso[6]]
    : br
      ? [br[3], br[2], br[1], br[4], br[5], br[6]]
      : null;
  if (!p) return null;
  const d = Date.parse(
    `${p[0]}-${p[1]}-${p[2]}T${p[3] ?? "00"}:${p[4] ?? "00"}:${p[5] ?? "00"}-03:00`,
  );
  return Number.isNaN(d) ? null : new Date(d).toISOString();
}

/** "1.234,56", "1234.56", "R$ 12,30" para "1234.56"; vazio ou inválido vira nulo. */
export function lerValorRelatorio(v: string | undefined): string | null {
  if (!v) return null;
  let t = v.replace(/[^\d,.-]/g, "");
  if (!t) return null;
  if (t.includes(",") && (!t.includes(".") || t.lastIndexOf(",") > t.lastIndexOf(".")))
    t = t.replace(/\./g, "").replace(",", ".");
  else t = t.replace(/,/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

/** Sub IDs vêm juntos em algumas exportações ("g1a2b3c4d-cBlack-o9f8e7d6c"). */
export function separarCodigos(v: string | undefined): string[] {
  if (!v) return [];
  const saida: string[] = [];
  for (const t of v.split(/[\s,;|]+/)) {
    const x = t.trim();
    if (!x) continue;
    if (/(^|-)[go][0-9a-f]{8}(-|$)/i.test(x))
      saida.push(...x.split("-").filter((p) => p.length >= 2));
    else if (x.length >= 2) saida.push(x);
  }
  return saida.slice(0, 10);
}

function indice(cab: string[], nome: string | undefined): number {
  if (!nome) return -1;
  const alvo = nome.trim().toLowerCase();
  return cab.findIndex((c) => c.trim().toLowerCase() === alvo);
}

export function lerConversoes(matriz: string[][], mapa: MapaConversoes) {
  const cab = matriz[0] ?? [];
  const i = {
    ref: indice(cab, mapa.ref),
    data: indice(cab, mapa.data),
    status: indice(cab, mapa.status),
    venda: indice(cab, mapa.venda),
    comissao: indice(cab, mapa.comissao),
    codigo: indice(cab, mapa.codigo),
  };
  if (i.ref < 0 || i.data < 0) return { ok: false as const, erro: "csv_colunas_faltando" };
  const linhas: LinhaConversao[] = [];
  const ignoradas: { linha: number; motivo: string }[] = [];
  for (let k = 1; k < matriz.length; k++) {
    const r = matriz[k];
    const ref = (r[i.ref] ?? "").trim();
    const data = lerDataRelatorio(r[i.data] ?? "");
    if (!ref || !data) {
      ignoradas.push({ linha: k, motivo: !ref ? "sem referência" : "data inválida" });
      continue;
    }
    linhas.push({
      ref: ref.slice(0, 120),
      data,
      status: i.status >= 0 ? (r[i.status] ?? "").trim().slice(0, 60) || null : null,
      venda: i.venda >= 0 ? lerValorRelatorio(r[i.venda]) : null,
      comissao: i.comissao >= 0 ? lerValorRelatorio(r[i.comissao]) : null,
      codigos: i.codigo >= 0 ? separarCodigos(r[i.codigo]) : [],
    });
  }
  return { ok: true as const, linhas, ignoradas };
}

export function lerCliques(matriz: string[][], mapa: MapaCliques) {
  const cab = matriz[0] ?? [];
  const i = {
    data: indice(cab, mapa.data),
    codigo: indice(cab, mapa.codigo),
    cliques: indice(cab, mapa.cliques),
  };
  if (i.data < 0 || i.codigo < 0 || i.cliques < 0)
    return { ok: false as const, erro: "csv_colunas_faltando" };
  const linhas: { dia: string; codigo: string; cliques: number }[] = [];
  const ignoradas: { linha: number; motivo: string }[] = [];
  for (let k = 1; k < matriz.length; k++) {
    const r = matriz[k];
    const data = lerDataRelatorio(r[i.data] ?? "");
    const codigo = (r[i.codigo] ?? "").trim();
    const cliques = Number((r[i.cliques] ?? "").replace(/\D/g, ""));
    if (!data || !codigo || !Number.isInteger(cliques)) {
      ignoradas.push({ linha: k, motivo: "linha incompleta" });
      continue;
    }
    const dia = new Date(Date.parse(data) - 3 * 3_600_000).toISOString().slice(0, 10);
    linhas.push({ dia, codigo: codigo.slice(0, 120), cliques });
  }
  return { ok: true as const, linhas, ignoradas };
}
