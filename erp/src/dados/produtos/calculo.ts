import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { ClienteBanco } from "@/dados/conhecimento-escrita";
import { listarEstoqueCom, type EstoqueAtual } from "@/dados/estoque/insumos";
import {
  chavesDesligadas,
  listarComponentesCom,
  obterParametrosVigentesCom,
  type ParametrosVigentes,
} from "@/dados/custos/parametros";
import { custoDeReposicao, type OrigemCusto } from "@/dominio/estoque/custo-medio";
import { paraBase, type Unidade } from "@/dominio/estoque/conversao";
import {
  custoHoraImpressora,
  impressoraPronta,
  CAMPO_IMPRESSORA_ROTULO,
} from "@/dominio/custos/impressora";
import type { ComponentesCusto, CustoHoraImpressora } from "@/dominio/custos/tipos";
import type { TaxasCanal } from "@/dominio/precos/preco";
import { fichaEfetiva, type FichaProduto } from "@/dominio/produtos/heranca";
import { resumirBom, type ItemBom, type ResumoBom } from "@/dominio/produtos/bom";
import { montarEntradasProduto } from "@/dominio/produtos/calculo-produto";
import type { EntradasCalculo } from "@/dominio/custos/motor";
import type { Produto, Variacao } from "./produtos";

export type CanalCalculo = {
  id: string;
  nome: string;
  taxas: Omit<TaxasCanal, "imposto_pct"> | null;
  faltam: string[];
};

export type ContextoProduto = {
  produto: Produto;
  variacao: Variacao | null;
  ficha: FichaProduto;
  bom: ResumoBom;
  custo_g: number | null;
  insumo: { id: string; nome: string; origem: string } | null;
  impressora: {
    id: string;
    nome: string;
    custoHora: CustoHoraImpressora | null;
    faltam: string[];
  } | null;
  parametros: ParametrosVigentes | null;
  desligados: (keyof ComponentesCusto)[];
  canais: CanalCalculo[];
};

const CAMPOS_CANAL = {
  comissao_pct: "comissão",
  taxa_pagamento_pct: "taxa de pagamento",
  ads_pct_padrao: "ads",
  taxa_fixa_item: "taxa fixa",
  frete_subsidio_padrao: "frete subsidiado",
} as const;

function custoBase(e: EstoqueAtual | undefined): number | null {
  if (!e) return null;
  return custoDeReposicao({
    origem_custo: (e.origem_custo ?? "media") as OrigemCusto,
    custo_medio: e.custo_medio,
    ultimo_custo: e.ultimo_custo,
    custo_manual: e.custo_manual,
  }).valor;
}

/** Junta ficha, BOM, insumo, impressora, parâmetros e canais para calcular um produto (ou variação). */
export async function contextoProdutoCom(
  cliente: ClienteBanco,
  produtoId: string,
  variacaoId: string | null,
): Promise<ContextoProduto | null> {
  const { data: produto } = await cliente
    .from("produtos")
    .select("*")
    .eq("id", produtoId)
    .maybeSingle();
  if (!produto) return null;
  const variacao = variacaoId
    ? (await cliente.from("produtos_variacoes").select("*").eq("id", variacaoId).maybeSingle()).data
    : null;
  const ficha = fichaEfetiva(
    { ...produto, atributos: (produto.atributos ?? {}) as Record<string, unknown> },
    variacao
      ? { ...variacao, atributos: (variacao.atributos ?? {}) as Record<string, unknown> }
      : null,
  );
  const [estoque, unidadesRes, materiaisRes, parametros, componentes, canaisRes, impressoraRes] =
    await Promise.all([
      listarEstoqueCom(cliente, { situacao: "todos" }),
      cliente.from("unidades").select("codigo, base, fator_para_base"),
      cliente
        .from("produtos_materiais")
        .select("*, insumo:insumos(id, nome, unidade_base)")
        .eq("produto_id", produtoId),
      obterParametrosVigentesCom(cliente),
      listarComponentesCom(cliente),
      cliente.from("canais_venda_vigentes").select("*").eq("ativo", true).order("nome"),
      ficha.impressora_padrao_id
        ? cliente.from("impressoras").select("*").eq("id", ficha.impressora_padrao_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
  const porInsumo = new Map(estoque.map((e) => [e.insumo_id!, e]));
  const unidades = (unidadesRes.data ?? []) as Unidade[];
  // BOM da variação sobrescreve a do produto para o mesmo insumo e papel.
  const materiais = (materiaisRes.data ?? []).filter(
    (m) => m.variacao_id === null || m.variacao_id === variacaoId,
  );
  const vistos = new Set<string>();
  const itens: ItemBom[] = [];
  for (const m of [...materiais].sort(
    (a, b) => (a.variacao_id ? -1 : 1) - (b.variacao_id ? -1 : 1),
  )) {
    const chave = `${m.insumo_id}:${m.papel}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const ins = m.insumo as { id: string; nome: string; unidade_base: string } | null;
    const qtdBase = ins
      ? paraBase(Number(m.quantidade), m.unidade, ins.unidade_base, unidades)
      : null;
    itens.push({
      insumo_id: m.insumo_id,
      nome: ins?.nome,
      quantidade: qtdBase ?? Number(m.quantidade),
      papel: m.papel as ItemBom["papel"],
      por: m.por as ItemBom["por"],
      custo_unitario: qtdBase == null ? null : custoBase(porInsumo.get(m.insumo_id)),
    });
  }
  const bom = resumirBom(itens);
  const estoqueInsumo = ficha.insumo_impressao_id
    ? porInsumo.get(ficha.insumo_impressao_id)
    : undefined;
  const custoG = custoBase(estoqueInsumo);
  const insumo = estoqueInsumo
    ? {
        id: estoqueInsumo.insumo_id!,
        nome: estoqueInsumo.nome!,
        origem: custoDeReposicao({
          origem_custo: (estoqueInsumo.origem_custo ?? "media") as OrigemCusto,
          custo_medio: estoqueInsumo.custo_medio,
          ultimo_custo: estoqueInsumo.ultimo_custo,
          custo_manual: estoqueInsumo.custo_manual,
        }).origem,
      }
    : null;
  const tarifa = parametros?.dados.tarifa_kwh ?? null;
  let impressora: ContextoProduto["impressora"] = null;
  if (impressoraRes.data) {
    const i = impressoraRes.data;
    const pronta = impressoraPronta(i);
    impressora = !pronta.ok
      ? {
          id: i.id,
          nome: i.nome,
          custoHora: null,
          faltam: pronta.faltam.map((k) => CAMPO_IMPRESSORA_ROTULO[k]),
        }
      : tarifa == null
        ? { id: i.id, nome: i.nome, custoHora: null, faltam: ["tarifa de energia nos parâmetros"] }
        : {
            id: i.id,
            nome: i.nome,
            custoHora: custoHoraImpressora(pronta.dados, tarifa),
            faltam: [],
          };
  }
  const canais: CanalCalculo[] = (canaisRes.data ?? []).map((c) => {
    const faltam = (Object.keys(CAMPOS_CANAL) as (keyof typeof CAMPOS_CANAL)[])
      .filter((k) => c[k] == null)
      .map((k) => CAMPOS_CANAL[k]);
    return {
      id: c.id!,
      nome: c.nome!,
      faltam,
      taxas:
        faltam.length > 0
          ? null
          : {
              comissao_pct: c.comissao_pct!,
              taxa_pagamento_pct: c.taxa_pagamento_pct!,
              ads_pct: c.ads_pct_padrao!,
              taxa_fixa_item: c.taxa_fixa_item!,
              frete_subsidio: c.frete_subsidio_padrao!,
            },
    };
  });
  return {
    produto,
    variacao,
    ficha,
    bom,
    custo_g: custoG,
    insumo,
    impressora,
    parametros,
    desligados: chavesDesligadas(componentes),
    canais,
  };
}

export async function contextoProduto(
  produtoId: string,
  variacaoId: string | null,
): Promise<ContextoProduto | null> {
  return contextoProdutoCom(await clienteServidor(), produtoId, variacaoId);
}

/** Entradas do motor para o contexto, com ou sem canal. */
export function entradasDoContexto(
  ctx: ContextoProduto,
  canalId: string | null,
):
  | { ok: true; entradas: EntradasCalculo; canal: CanalCalculo | null }
  | { ok: false; faltam: string[] } {
  const canal = canalId ? (ctx.canais.find((c) => c.id === canalId) ?? null) : null;
  if (canalId && !canal) return { ok: false, faltam: ["canal"] };
  if (canal && !canal.taxas)
    return { ok: false, faltam: canal.faltam.map((f) => `${f} do canal ${canal.nome}`) };
  if (!ctx.parametros) return { ok: false, faltam: ["parâmetros de custo"] };
  const m = montarEntradasProduto({
    ficha: ctx.ficha,
    bom: ctx.bom,
    custo_g: ctx.custo_g,
    impressora: ctx.impressora?.custoHora ?? null,
    parametros: ctx.parametros.dados,
    canal: canal?.taxas ?? null,
    margem_alvo: ctx.produto.margem_alvo,
    markup_alvo: null,
    desligados: ctx.desligados,
  });
  if (!m.ok) return m;
  return { ok: true, entradas: m.entradas, canal };
}
