import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { listarCalculos } from "@/dados/custos/calculos";
import { listarEstoque } from "@/dados/estoque/insumos";
import { custoDeReposicao, type OrigemCusto } from "@/dominio/estoque/custo-medio";
import { TabelaCalculos, type CalculoLinha } from "@/componentes/custos/TabelaCalculos";
import { Button } from "@/componentes/ui/button";

// Vercel: importações, geração e MCP podem passar dos 10 s padrão.
export const maxDuration = 60;

export const metadata = { title: "Histórico de cálculos" };

export default async function PaginaHistorico({
  searchParams,
}: {
  searchParams: Promise<{ destaque?: string }>;
}) {
  await exigirLeitura("catalogo");
  const { destaque } = await searchParams;
  const [calculos, filamentos] = await Promise.all([
    listarCalculos(300),
    listarEstoque({ tipo: "filamento", situacao: "todos" }),
  ]);
  const custoAtual = new Map(
    filamentos.map((f) => [
      f.insumo_id!,
      custoDeReposicao({
        origem_custo: (f.origem_custo ?? "media") as OrigemCusto,
        custo_medio: f.custo_medio,
        ultimo_custo: f.ultimo_custo,
        custo_manual: f.custo_manual,
      }).valor,
    ]),
  );
  const itens: CalculoLinha[] = calculos.map((c) => ({
    ...c,
    custo_g_atual: c.insumo_id ? (custoAtual.get(c.insumo_id) ?? null) : null,
  }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            Histórico de cálculos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Cada linha é um snapshot: entradas, resultado e versão do motor. Quando o filamento muda
            de preço, a coluna da direita avisa o que vale revisar.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/catalogo/precificacao">Abrir calculadora</Link>
        </Button>
      </div>
      <TabelaCalculos itens={itens} destaque={destaque} />
    </div>
  );
}
