import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { resumoInicial } from "@/dados/dashboard";
import { formatarQuantidade } from "@/lib/formatos/numero";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { CartaoIndicador } from "@/componentes/painel/CartaoIndicador";
import { SeletorPeriodo, lerPeriodo, PERIODOS } from "@/componentes/painel/SeletorPeriodo";
import { Banner } from "@/componentes/painel/Banner";
import { Button } from "@/componentes/ui/button";
import { ProximosItens } from "@/componentes/planejamento/ProximosItens";

export const metadata = { title: "Início" };

const FUTUROS: { rotulo: string; fase: number }[] = [];

export default async function PaginaInicio({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const usuario = await exigirLeitura("inicio");
  const { periodo } = await searchParams;
  const atual = lerPeriodo(periodo);
  const resumo = await resumoInicial(atual, usuario.papel);
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
        {resumo.planejamento && (
          <ProximosItens
            proximos={resumo.planejamento.proximos}
            atrasados={resumo.planejamento.atrasados}
            hoje={resumo.planejamento.hoje}
          />
        )}
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
          variacao={{ percentual: resumo.comparacao.consumo, rotulo: resumo.comparacao.rotulo }}
          valor={
            resumo.consumoFilamentoG === null
              ? null
              : formatarQuantidade(resumo.consumoFilamentoG, "g")
          }
          dica="Cadastre um filamento em Estoque"
          link={{ href: "/estoque/movimentacoes?tipo=consumo_producao", rotulo: "Ver consumo" }}
        />
        {resumo.financeiro && (
          <>
            <CartaoIndicador
              rotulo={`Receita recebida (${rotuloPeriodo})`}
              variacao={{
                percentual: resumo.comparacao.recebido,
                rotulo: resumo.comparacao.rotulo,
              }}
              valor={formatarMoeda(resumo.financeiro.recebido)}
              link={{ href: "/financeiro", rotulo: "Abrir o financeiro" }}
            />
            <CartaoIndicador
              rotulo={`Despesas pagas (${rotuloPeriodo})`}
              variacao={{ percentual: resumo.comparacao.pago, rotulo: resumo.comparacao.rotulo }}
              valor={formatarMoeda(resumo.financeiro.pago)}
              link={{ href: "/financeiro/lancamentos?estado=realizado", rotulo: "Ver lançamentos" }}
            />
            <CartaoIndicador
              rotulo="A receber e a pagar (30 dias)"
              valor={`${formatarMoeda(resumo.financeiro.abertos.proximos30.receber)} / ${formatarMoeda(resumo.financeiro.abertos.proximos30.pagar)}`}
              rodape={
                resumo.financeiro.abertos.vencidos.pagar +
                  resumo.financeiro.abertos.vencidos.receber >
                0 ? (
                  <span className="text-xs text-erro">
                    vencidos: {formatarMoeda(resumo.financeiro.abertos.vencidos.receber)} a receber,{" "}
                    {formatarMoeda(resumo.financeiro.abertos.vencidos.pagar)} a pagar
                  </span>
                ) : undefined
              }
              link={{ href: "/financeiro/lancamentos?estado=abertos", rotulo: "Ver abertos" }}
            />
          </>
        )}
        <CartaoIndicador
          rotulo={`Faturamento (${rotuloPeriodo})`}
          variacao={{ percentual: resumo.comparacao.faturamento, rotulo: resumo.comparacao.rotulo }}
          valor={resumo.faturamento === null ? null : formatarMoeda(resumo.faturamento.total)}
          dica="Nenhum pedido registrado"
          rodape={
            resumo.faturamento ? (
              <span className="text-xs text-texto-3">
                {resumo.faturamento.pedidos} pedido(s) pago(s); base de vendas
              </span>
            ) : undefined
          }
          link={{ href: "/vendas/pedidos", rotulo: "Ver pedidos" }}
        />
        <CartaoIndicador
          rotulo="Pedidos abertos"
          valor={String(resumo.pedidosAbertos)}
          link={{ href: "/vendas/pedidos", rotulo: "Abrir pedidos" }}
        />
        <CartaoIndicador
          rotulo="Ordens em andamento"
          valor={String(resumo.ordensAbertas)}
          link={{ href: "/producao/fila", rotulo: "Abrir a fila" }}
        />
        <CartaoIndicador
          rotulo="Peças prontas em estoque"
          valor={String(resumo.pecasProntas)}
          link={{ href: "/catalogo/produtos", rotulo: "Ver produtos" }}
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
