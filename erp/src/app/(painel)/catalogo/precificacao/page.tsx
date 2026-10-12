import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarCanais } from "@/dados/configuracoes/canais";
import { listarEstoque } from "@/dados/estoque/insumos";
import { listarImpressoras } from "@/dados/custos/impressoras";
import {
  chavesDesligadas,
  listarComponentes,
  obterParametrosVigentes,
} from "@/dados/custos/parametros";
import { obterCalculo, lerSnapshot } from "@/dados/custos/calculos";
import { custoDeReposicao, type OrigemCusto } from "@/dominio/estoque/custo-medio";
import {
  custoHoraImpressora,
  impressoraPronta,
  CAMPO_IMPRESSORA_ROTULO,
} from "@/dominio/custos/impressora";
import { parametrosFaltantes } from "@/dominio/custos/parametros";
import {
  Calculadora,
  type CalculoInicial,
  type OpcaoCanal,
  type OpcaoImpressora,
  type OpcaoInsumo,
} from "@/componentes/custos/Calculadora";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Precificação" };

const CAMPOS_CANAL = {
  comissao_pct: "comissão",
  taxa_pagamento_pct: "taxa de pagamento",
  ads_pct_padrao: "ads",
  taxa_fixa_item: "taxa fixa",
  frete_subsidio_padrao: "frete subsidiado",
} as const;

export default async function PaginaPrecificacao({
  searchParams,
}: {
  searchParams: Promise<{ base?: string }>;
}) {
  const usuario = await exigirLeitura("catalogo");
  const { base } = await searchParams;
  const [parametros, componentes, filamentos, impressoras, canais, calculoBase] = await Promise.all(
    [
      obterParametrosVigentes(),
      listarComponentes(),
      listarEstoque({ tipo: "filamento", situacao: "ativos" }),
      listarImpressoras(false),
      listarCanais(),
      base ? obterCalculo(base) : Promise.resolve(null),
    ],
  );
  const tarifa = parametros?.dados.tarifa_kwh ?? null;
  const opcoesInsumo: OpcaoInsumo[] = filamentos.map((f) => {
    const r = custoDeReposicao({
      origem_custo: (f.origem_custo ?? "media") as OrigemCusto,
      custo_medio: f.custo_medio,
      ultimo_custo: f.ultimo_custo,
      custo_manual: f.custo_manual,
    });
    return { id: f.insumo_id!, nome: f.nome!, custo_g: r.valor, origem: r.origem };
  });
  const opcoesImpressora: OpcaoImpressora[] = impressoras.map((i) => {
    const pronta = impressoraPronta(i);
    if (!pronta.ok)
      return {
        id: i.id,
        nome: i.nome,
        custoHora: null,
        faltam: pronta.faltam.map((k) => CAMPO_IMPRESSORA_ROTULO[k]),
      };
    if (tarifa == null)
      return {
        id: i.id,
        nome: i.nome,
        custoHora: null,
        faltam: ["tarifa de energia nos parâmetros"],
      };
    return {
      id: i.id,
      nome: i.nome,
      custoHora: custoHoraImpressora(pronta.dados, tarifa),
      faltam: [],
    };
  });
  const opcoesCanal: OpcaoCanal[] = canais
    .filter((c) => c.ativo)
    .map((c) => {
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
  const inicial: CalculoInicial | undefined = calculoBase
    ? {
        nome: calculoBase.nome,
        entradas: lerSnapshot(calculoBase).entradas,
        insumo_id: calculoBase.insumo_id,
        impressora_id: calculoBase.impressora_id,
        canal_id: calculoBase.canal_id,
        metodo: calculoBase.metodo_margem,
      }
    : undefined;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Precificação</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Custo por peça boa com falha e desperdício, e preço por canal com equilíbrio, margem e
            markup lado a lado. Fórmulas em docs/formulas-de-custo.md.
            {inicial && ` Reabrindo "${inicial.nome}" como ponto de partida.`}
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/catalogo/precificacao/historico">Histórico</Link>
        </Button>
      </div>
      <Calculadora
        parametros={parametros?.dados ?? null}
        versaoParametros={parametros?.versao ?? null}
        faltamParametros={
          parametros
            ? parametrosFaltantes(parametros.dados)
            : ["tarifa_kwh", "custo_hora_mao_obra", "metodo_rateio_fixo"]
        }
        insumos={opcoesInsumo}
        impressoras={opcoesImpressora}
        canais={opcoesCanal}
        desligados={chavesDesligadas(componentes)}
        editar={podeEscrever(usuario.papel, "catalogo")}
        inicial={inicial}
      />
    </div>
  );
}
