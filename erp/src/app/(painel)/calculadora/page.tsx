import { exigirLeitura } from "@/lib/auth/sessao";
import { listarEstoque } from "@/dados/estoque/insumos";
import { listarImpressoras } from "@/dados/custos/impressoras";
import { obterParametrosVigentes } from "@/dados/custos/parametros";
import { custoDeReposicao, type OrigemCusto } from "@/dominio/estoque/custo-medio";
import { custoHoraImpressora, custoHoraTotal, impressoraPronta } from "@/dominio/custos/impressora";
import {
  CalculadoraMarketplace,
  type OpcaoEmbalagem,
  type OpcaoFilamento,
  type OpcaoImpressoraRapida,
} from "@/componentes/custos/CalculadoraMarketplace";

export const metadata = { title: "Calculadora" };

const TIPOS_EMBALAGEM = ["embalagem", "caixa", "etiqueta", "fixador"];

const reposicao = (i: {
  origem_custo: string | null;
  custo_medio: number | null;
  ultimo_custo: number | null;
  custo_manual: number | null;
}) =>
  custoDeReposicao({
    origem_custo: (i.origem_custo ?? "media") as OrigemCusto,
    custo_medio: i.custo_medio,
    ultimo_custo: i.ultimo_custo,
    custo_manual: i.custo_manual,
  }).valor;

export default async function PaginaCalculadora() {
  await exigirLeitura("catalogo");
  const [parametros, estoque, impressoras] = await Promise.all([
    obterParametrosVigentes(),
    listarEstoque({ situacao: "ativos" }),
    listarImpressoras(false),
  ]);
  const tarifa = parametros?.dados.tarifa_kwh ?? null;

  const filamentos: OpcaoFilamento[] = estoque
    .filter((i) => i.tipo === "filamento")
    .map((i) => {
      const custoG = reposicao(i);
      return { id: i.insumo_id!, nome: i.nome!, custo_kg: custoG == null ? null : custoG * 1000 };
    });
  const embalagens: OpcaoEmbalagem[] = estoque
    .filter((i) => TIPOS_EMBALAGEM.includes(i.tipo ?? ""))
    .map((i) => ({
      id: i.insumo_id!,
      nome: i.nome!,
      custo_unitario: reposicao(i),
      unidade: i.unidade_base,
    }));
  const opcoesImpressora: OpcaoImpressoraRapida[] = [];
  for (const i of impressoras) {
    const pronta = impressoraPronta(i);
    if (!pronta.ok || tarifa == null) continue;
    const hora = custoHoraImpressora(pronta.dados, tarifa);
    opcoesImpressora.push({
      id: i.id,
      nome: i.nome,
      energia_hora: hora.energia,
      maquina_hora: custoHoraTotal(hora).maquina,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Calculadora</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          Custo de produção da peça, preço de venda por plataforma com as taxas da faixa de preço, e
          o ROAS que o anúncio precisa bater. Fórmulas em docs/formulas-de-custo.md.
        </p>
      </div>
      <CalculadoraMarketplace
        filamentos={filamentos}
        impressoras={opcoesImpressora}
        embalagens={embalagens}
        impostoPadrao={parametros?.dados.imposto_pct_estimado ?? null}
      />
    </div>
  );
}
