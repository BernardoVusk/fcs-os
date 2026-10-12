/** Filtros, ordenação e quadro do planejamento. Puro. */
import { dataDoItem, inicioDaSemana, somarDias } from "./calendario";
import { tipoValido, type TipoItem } from "./tipos";

/** O mínimo que filtros, ordenação e quadro precisam de um item. */
export type ItemBase = {
  id: string;
  tipo: string;
  titulo: string;
  status: string;
  prioridade: string;
  inicio: string | null;
  prazo: string | null;
  horario?: string | null;
  canal_publicacao?: string | null;
  formato?: string | null;
  campanha_id?: string | null;
  tags?: string[] | null;
  /** Derivado do fluxo: status fechado não conta como pendência. */
  fechado: boolean;
};

export type Fluxo = { codigo: string; nome: string; fechado: boolean; padrao?: boolean };

export function atrasado(i: { prazo: string | null; fechado: boolean }, hoje: string): boolean {
  return !!i.prazo && i.prazo < hoje && !i.fechado;
}

export function ehHoje(
  i: { prazo: string | null; inicio: string | null; fechado: boolean },
  hoje: string,
): boolean {
  return dataDoItem(i) === hoje && !i.fechado;
}

/** Segunda a domingo da semana de hoje. */
export function nestaSemana(
  i: { prazo: string | null; inicio: string | null },
  hoje: string,
): boolean {
  const d = dataDoItem(i);
  if (!d) return false;
  const seg = inicioDaSemana(hoje);
  return d >= seg && d <= somarDias(seg, 6);
}

/** De hoje até hoje + n dias, só o que não está fechado. */
export function nosProximosDias(
  i: { prazo: string | null; inicio: string | null; fechado: boolean },
  hoje: string,
  n: number,
): boolean {
  const d = dataDoItem(i);
  return !!d && d >= hoje && d <= somarDias(hoje, n) && !i.fechado;
}

export const FILTROS_RAPIDOS = [
  "todos",
  "hoje",
  "atrasados",
  "semana",
  "sem_data",
  "abertos",
] as const;
export type FiltroRapido = (typeof FILTROS_RAPIDOS)[number];
export const FILTRO_RAPIDO_ROTULO: Record<FiltroRapido, string> = {
  todos: "Todos",
  abertos: "Abertos",
  hoje: "Hoje",
  atrasados: "Atrasados",
  semana: "Esta semana",
  sem_data: "Sem data",
};

export type Filtros = {
  rapido: FiltroRapido;
  tipo: TipoItem | "";
  status: string;
  canal: string;
  campanha: string;
  q: string;
};

export function lerFiltros(sp: Record<string, string | undefined>): Filtros {
  const v = (k: string) => (sp[k] ?? "").trim();
  const rapido = v("rapido");
  const tipo = v("tipo");
  return {
    rapido: (FILTROS_RAPIDOS as readonly string[]).includes(rapido)
      ? (rapido as FiltroRapido)
      : "todos",
    tipo: tipoValido(tipo) ? tipo : "",
    status: /^[a-z_]{0,30}$/.test(v("status")) ? v("status") : "",
    canal: /^[a-z_]{0,30}$/.test(v("canal")) ? v("canal") : "",
    campanha: /^[0-9a-f-]{36}$/i.test(v("campanha")) ? v("campanha") : "",
    q: v("q").slice(0, 80),
  };
}

export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function aplicarFiltros<T extends ItemBase>(
  itens: readonly T[],
  f: Filtros,
  hoje: string,
): T[] {
  const termo = normalizar(f.q.trim());
  return itens.filter((i) => {
    if (f.rapido === "hoje" && !ehHoje(i, hoje)) return false;
    if (f.rapido === "atrasados" && !atrasado(i, hoje)) return false;
    if (f.rapido === "semana" && !nestaSemana(i, hoje)) return false;
    if (f.rapido === "sem_data" && dataDoItem(i)) return false;
    if (f.rapido === "abertos" && i.fechado) return false;
    if (f.tipo && i.tipo !== f.tipo) return false;
    if (f.status && i.status !== f.status) return false;
    if (f.canal && i.canal_publicacao !== f.canal) return false;
    if (f.campanha && i.campanha_id !== f.campanha) return false;
    if (termo) {
      const alvo = normalizar(`${i.titulo} ${(i.tags ?? []).join(" ")}`);
      if (!termo.split(/\s+/).every((p) => alvo.includes(p))) return false;
    }
    return true;
  });
}

const ORDEM_PRIORIDADE: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

/** Data crescente (sem data por último), depois horário, prioridade e título. */
export function ordenarItens<T extends ItemBase>(itens: readonly T[]): T[] {
  return [...itens].sort((a, b) => {
    const da = dataDoItem(a);
    const db = dataDoItem(b);
    if (da !== db) {
      if (!da) return 1;
      if (!db) return -1;
      return da < db ? -1 : 1;
    }
    const ha = a.horario ?? "";
    const hb = b.horario ?? "";
    if (ha !== hb) {
      if (!ha) return 1;
      if (!hb) return -1;
      return ha < hb ? -1 : 1;
    }
    const pa = ORDEM_PRIORIDADE[a.prioridade] ?? 1;
    const pb = ORDEM_PRIORIDADE[b.prioridade] ?? 1;
    if (pa !== pb) return pa - pb;
    return a.titulo.localeCompare(b.titulo, "pt-BR");
  });
}

export type ColunaQuadro<T> = Fluxo & { itens: T[] };
export type Quadro<T> = { colunas: ColunaQuadro<T>[] };

/** Uma coluna por status do fluxo, na ordem do fluxo; item com status fora do fluxo é ignorado. */
export function montarQuadro<T extends ItemBase>(
  itens: readonly T[],
  fluxo: readonly Fluxo[],
): Quadro<T> {
  const ordenados = ordenarItens(itens);
  return {
    colunas: fluxo.map((f) => ({ ...f, itens: ordenados.filter((i) => i.status === f.codigo) })),
  };
}

/** Movimento otimista: tira o cartão da coluna de origem e põe no topo do destino, já com o novo status. */
export function moverNoQuadro<T extends ItemBase>(
  q: Quadro<T>,
  id: string,
  destino: string,
): Quadro<T> {
  const origem = q.colunas.find((c) => c.itens.some((i) => i.id === id));
  const alvo = q.colunas.find((c) => c.codigo === destino);
  if (!origem || !alvo || origem.codigo === destino) return q;
  const cartao = origem.itens.find((i) => i.id === id) as T;
  return {
    colunas: q.colunas.map((c) => {
      if (c.codigo === origem.codigo) return { ...c, itens: c.itens.filter((i) => i.id !== id) };
      if (c.codigo === destino)
        return { ...c, itens: [{ ...cartao, status: destino, fechado: c.fechado }, ...c.itens] };
      return c;
    }),
  };
}

export function contarPorStatus(itens: readonly { status: string }[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const i of itens) r[i.status] = (r[i.status] ?? 0) + 1;
  return r;
}

/** Resumo de um conjunto de itens para cabeçalhos: total, fechados, atrasados, hoje. */
export function resumir(itens: readonly ItemBase[], hoje: string) {
  const abertos = itens.filter((i) => !i.fechado);
  return {
    total: itens.length,
    abertos: abertos.length,
    fechados: itens.length - abertos.length,
    atrasados: itens.filter((i) => atrasado(i, hoje)).length,
    hoje: itens.filter((i) => ehHoje(i, hoje)).length,
    semData: abertos.filter((i) => !dataDoItem(i)).length,
  };
}
