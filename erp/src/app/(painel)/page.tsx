import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { resumoInicial } from "@/dados/dashboard";
import { CartaoIndicador } from "@/componentes/painel/CartaoIndicador";
import { SeletorPeriodo, lerPeriodo } from "@/componentes/painel/SeletorPeriodo";
import { Banner } from "@/componentes/painel/Banner";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Início" };

const FUTUROS: { rotulo: string; fase: number }[] = [
  { rotulo: "Faturamento do período", fase: 6 },
  { rotulo: "Receita recebida", fase: 7 },
  { rotulo: "Despesas pagas", fase: 7 },
  { rotulo: "A pagar e a receber", fase: 7 },
  { rotulo: "Pedidos em produção", fase: 5 },
  { rotulo: "Materiais abaixo do mínimo", fase: 3 },
  { rotulo: "Consumo de filamento", fase: 3 },
  { rotulo: "Próximas tarefas e publicações", fase: 8 },
];

export default async function PaginaInicio({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  await exigirLeitura("inicio");
  const { periodo } = await searchParams;
  const atual = lerPeriodo(periodo);
  const resumo = await resumoInicial();
  const faltam = resumo.canaisTotal - resumo.canaisComTaxas;
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
          {faltam} de {resumo.canaisTotal} canais ativos ainda não têm comissão registrada. Sem isso a precificação (Fase 4)
          não calcula.
        </Banner>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        <CartaoIndicador
          rotulo="Alertas abertos"
          valor={String(resumo.alertasAbertos)}
          rodape={<span className="text-xs text-texto-3">Central de alertas chega na Fase 9</span>}
        />
        <CartaoIndicador rotulo="Canais com taxas" valor={`${resumo.canaisComTaxas} de ${resumo.canaisTotal}`} link={{ href: "/configuracoes/canais", rotulo: "Configurar canais" }} />
        <CartaoIndicador rotulo="Conhecimentos ativos" valor={String(resumo.conhecimentosAtivos)} link={{ href: "/conhecimento", rotulo: "Abrir a base" }} />
        {FUTUROS.map((f) => (
          <CartaoIndicador key={f.rotulo} rotulo={f.rotulo} valor={null} dica={`Disponível na Fase ${f.fase}`} />
        ))}
      </div>
      <p className="text-xs text-texto-3">
        O período selecionado ({atual}) passa a valer quando os indicadores de vendas e financeiro existirem. Nenhum
        número aqui é estimativa.
      </p>
    </div>
  );
}
