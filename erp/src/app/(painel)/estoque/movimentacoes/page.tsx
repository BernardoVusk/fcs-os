import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarMovimentacoes } from "@/dados/estoque/movimentacoes";
import { TIPO_MOVIMENTACAO_ROTULO, TIPOS_MOVIMENTACAO } from "@/dominio/estoque/conversao";
import { TabelaMovimentacoes } from "@/componentes/estoque/TabelaMovimentacoes";
import { cn } from "@/lib/utils";

export const metadata = { title: "Movimentações" };

export default async function PaginaMovimentacoes({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const usuario = await exigirLeitura("estoque");
  const { tipo } = await searchParams;
  const tipoValido = TIPOS_MOVIMENTACAO.includes(tipo as (typeof TIPOS_MOVIMENTACAO)[number])
    ? tipo
    : undefined;
  const itens = await listarMovimentacoes({ tipo: tipoValido, limite: 300 });
  const editar = podeEscrever(usuario.papel, "estoque");
  const pilula = (ativo: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
      ativo ? "bg-card font-medium text-texto shadow-painel" : "text-texto-2 hover:text-texto",
    );
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
          Movimentações de estoque
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          Razão imutável: cada entrada, consumo, perda e ajuste com lote, valor e motivo. Erros se
          corrigem por estorno, nunca apagando.
        </p>
      </div>
      <nav
        aria-label="Tipo"
        className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-superficie-2 p-1"
      >
        <Link
          href="/estoque/movimentacoes"
          className={pilula(!tipoValido)}
          aria-current={!tipoValido ? "page" : undefined}
        >
          Todas
        </Link>
        {TIPOS_MOVIMENTACAO.map((t) => (
          <Link
            key={t}
            href={`/estoque/movimentacoes?tipo=${t}`}
            className={pilula(tipoValido === t)}
            aria-current={tipoValido === t ? "page" : undefined}
          >
            {TIPO_MOVIMENTACAO_ROTULO[t]}
          </Link>
        ))}
      </nav>
      <TabelaMovimentacoes itens={itens} editar={editar} />
      <p className="text-xs text-texto-3">
        Mostrando as últimas {itens.length} movimentações. Para registrar consumo, perda ou ajuste,
        abra a ficha do insumo.
      </p>
    </div>
  );
}
