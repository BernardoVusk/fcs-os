import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { resumoInicial } from "@/dados/dashboard";
import { formatarQuantidade } from "@/lib/formatos/numero";
import { CartaoIndicador } from "@/componentes/painel/CartaoIndicador";
import { SeletorPeriodo, lerPeriodo, PERIODOS } from "@/componentes/painel/SeletorPeriodo";
import { Banner } from "@/componentes/painel/Banner";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Início" };

const FUTUROS: { rotulo: string; fase: number }[] = [
  { rotulo: "Faturamento do período", fase: 6 },
  { rotulo: "Receita recebida", fase: 7 },
  { rotulo: "Despesas pagas", fase: 7 },
  { rotulo: "A pagar e a receber", fase: 7 },
  { rotulo: "Pedidos em produção", fase: 5 },
  { rotulo: "Próximas tarefas e publicações", fase: 8 },
];

export default async function PaginaInicio({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  await exigirLeitura("inicio");
  const { periodo } = await searchParams;
  const atual = lerPeriodo(periodo);
  const resumo = await resumoInicial(atual);
  const faltam = resumo.canaisTotal - resumo.canaisComTaxas;
  const rotuloPeriodo = PERIODOS.find((p) => p.chave === atual)?.rotulo.toLowerCase() ?? atual;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Início</h1>
        <SeletorPeriodo atual={atual} base="/" />
      </div>
      {faltam > 0 && (
        <Banner
          tipo="alerta"
          titulo="Canais sem taxas configuradas"
          acao={
            <Button asChild size="sm" variant="outline">
              <Link href="/configuracoes/canais">Configurar</Link>
            </Button>
          }
        >
          {faltam} de {resumo.canaisTotal} canais ativos ainda não têm comissão registrada. Sem isso
          a precificação (Fase 4) não calcula.
        </Banner>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        <CartaoIndicador
          rotulo="Alertas abertos"
          valor={String(resumo.alertasAbertos)}
          rodape={<span className="text-xs text-texto-3">Central de alertas chega na Fase 9</span>}
        />
        <CartaoIndicador
          rotulo="Materiais abaixo do mínimo"
          valor={String(resumo.insumosAbaixoMinimo)}
          link={{
            href: resumo.insumosAbaixoMinimo > 0 ? "/estoque/insumos?minimo=1" : "/estoque/insumos",
            rotulo: resumo.insumosAbaixoMinimo > 0 ? "Ver o que repor" : "Ver insumos",
          }}
        />
        <CartaoIndicador
          rotulo={`Consumo de filamento (${rotuloPeriodo})`}
          valor={
            resumo.consumoFilamentoG === null
              ? null
              : formatarQuantidade(resumo.consumoFilamentoG, "g")
          }
          dica="Cadastre um filamento em Estoque"
          link={{ href: "/estoque/movimentacoes?tipo=consumo_producao", rotulo: "Ver consumo" }}
        />
        <CartaoIndicador
          rotulo="Cálculos de custo salvos"
          valor={String(resumo.calculosSalvos)}
          link={{ href: "/catalogo/precificacao", rotulo: "Abrir a calculadora" }}
        />
        <CartaoIndicador
          rotulo="Canais com taxas"
          valor={`${resumo.canaisComTaxas} de ${resumo.canaisTotal}`}
          link={{ href: "/configuracoes/canais", rotulo: "Configurar canais" }}
        />
        <CartaoIndicador
          rotulo="Conhecimentos ativos"
          valor={String(resumo.conhecimentosAtivos)}
          link={{ href: "/conhecimento", rotulo: "Abrir a base" }}
        />
        {FUTUROS.map((f) => (
          <CartaoIndicador
            key={f.rotulo}
            rotulo={f.rotulo}
            valor={null}
            dica={`Disponível na Fase ${f.fase}`}
          />
        ))}
      </div>
      <p className="text-xs text-texto-3">
        O período vale para o consumo de filamento e, nas próximas fases, para vendas e financeiro.
        Nenhum número aqui é estimativa.
      </p>
    </div>
  );
}
