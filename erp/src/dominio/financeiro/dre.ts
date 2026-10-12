import Decimal from "decimal.js";
import type { TipoLancamento } from "./estados";

export type RealizacaoDre = {
  tipo: TipoLancamento;
  /** Data da realização (pagamento ou recebimento). */
  data: string;
  valor: number;
  categoria: { nome: string; natureza: "fixa" | "variavel"; embutido_no_custo: boolean } | null;
  /** Realização de um lançamento de estorno, ou de um lançamento estornado: fora da DRE. */
  estorno: boolean;
};

export type LinhaDre = { categoria: string; natureza: "fixa" | "variavel"; valor: number };
export type Dre = {
  receitas: number;
  despesas_fixas: number;
  despesas_variaveis: number;
  resultado: number;
  /** Informativo: o que ficou de fora porque já chega ao resultado pelo custo realizado das ordens. */
  embutidas_no_custo: number;
  linhas_receita: LinhaDre[];
  linhas_despesa: LinhaDre[];
};

const r2 = (d: Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

/**
 * DRE gerencial de um período (spec 5.7): soma realizações, exclui estornos, transferências e categorias
 * `embutido_no_custo` (compra de filamento, energia, manutenção), que entram no resultado pelo custo realizado.
 */
export function dreGerencial(realizacoes: RealizacaoDre[], inicio: string, fim: string): Dre {
  let receitas = new Decimal(0);
  let fixas = new Decimal(0);
  let variaveis = new Decimal(0);
  let embutidas = new Decimal(0);
  const porCategoria = new Map<
    string,
    { natureza: "fixa" | "variavel"; tipo: TipoLancamento; valor: Decimal }
  >();
  for (const r of realizacoes) {
    if (r.data < inicio || r.data > fim || r.estorno || r.tipo === "transferencia") continue;
    const v = new Decimal(r.valor);
    if (r.categoria?.embutido_no_custo) {
      if (r.tipo === "despesa") embutidas = embutidas.plus(v);
      continue;
    }
    const nome = r.categoria?.nome ?? "Sem categoria";
    const natureza = r.categoria?.natureza ?? "variavel";
    const chave = `${r.tipo}:${nome}`;
    const linha = porCategoria.get(chave) ?? { natureza, tipo: r.tipo, valor: new Decimal(0) };
    linha.valor = linha.valor.plus(v);
    porCategoria.set(chave, linha);
    if (r.tipo === "receita") receitas = receitas.plus(v);
    else if (natureza === "fixa") fixas = fixas.plus(v);
    else variaveis = variaveis.plus(v);
  }
  const linhas = [...porCategoria.entries()].map(([chave, l]) => ({
    categoria: chave.split(":").slice(1).join(":"),
    natureza: l.natureza,
    valor: r2(l.valor),
    tipo: l.tipo,
  }));
  return {
    receitas: r2(receitas),
    despesas_fixas: r2(fixas),
    despesas_variaveis: r2(variaveis),
    resultado: r2(receitas.minus(fixas).minus(variaveis)),
    embutidas_no_custo: r2(embutidas),
    linhas_receita: linhas
      .filter((l) => l.tipo === "receita")
      .map(({ categoria, natureza, valor }) => ({ categoria, natureza, valor })),
    linhas_despesa: linhas
      .filter((l) => l.tipo === "despesa")
      .map(({ categoria, natureza, valor }) => ({ categoria, natureza, valor })),
  };
}
