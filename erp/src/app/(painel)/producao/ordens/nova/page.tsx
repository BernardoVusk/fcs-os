import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { clienteServidor } from "@/lib/supabase/servidor";
import { listarProdutosResumo } from "@/dados/produtos/produtos";
import { listarImpressoras } from "@/dados/custos/impressoras";
import { FormOrdem, type LoteOpcao } from "@/componentes/producao/FormOrdem";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Nova ordem de produção" };

export default async function PaginaNovaOrdem({
  searchParams,
}: {
  searchParams: Promise<{ produto?: string }>;
}) {
  const usuario = await exigirLeitura("producao");
  if (!podeEscrever(usuario.papel, "producao")) redirect("/producao/fila");
  const { produto } = await searchParams;
  const supabase = await clienteServidor();
  const [produtos, impressoras, lotes] = await Promise.all([
    listarProdutosResumo(),
    listarImpressoras(false),
    supabase
      .from("lotes_insumo")
      .select("id, codigo, quantidade_atual, insumo_id, insumo:insumos(unidade_base)")
      .gt("quantidade_atual", 0)
      .order("aberto_em"),
  ]);
  const lotesPorInsumo: Record<string, LoteOpcao[]> = {};
  for (const l of lotes.data ?? []) {
    const unidade = (l.insumo as { unidade_base: string } | null)?.unidade_base ?? "";
    (lotesPorInsumo[l.insumo_id] ??= []).push({
      id: l.id,
      codigo: l.codigo,
      quantidade_atual: Number(l.quantidade_atual),
      unidade,
    });
  }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
          Nova ordem de produção
        </h1>
        <p className="mt-1 text-sm text-texto-2">
          Tempo previsto e custo estimado vêm da ficha e do último cálculo do produto.
        </p>
      </div>
      {produtos.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum produto cadastrado"
          descricao="A ordem nasce de um produto."
          acao={
            <Button asChild size="sm">
              <Link href="/catalogo/produtos/novo">Novo produto</Link>
            </Button>
          }
        />
      ) : (
        <FormOrdem
          produtos={produtos}
          impressoras={impressoras.map((i) => ({ id: i.id, nome: i.nome }))}
          lotesPorInsumo={lotesPorInsumo}
          produtoInicial={produto}
        />
      )}
    </div>
  );
}
