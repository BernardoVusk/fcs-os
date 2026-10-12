import Link from "next/link";
import { Plus } from "lucide-react";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { contarProdutos, listarProdutos } from "@/dados/produtos/produtos";
import { listarCanais } from "@/dados/configuracoes/canais";
import { recalcularProdutos } from "@/acoes/produtos/calculo";
import { TabelaProdutos } from "@/componentes/produtos/TabelaProdutos";
import { STATUS_PRODUTO } from "@/componentes/produtos/FormProduto";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { Banner } from "@/componentes/painel/Banner";
import { Button } from "@/componentes/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Produtos" };

export default async function PaginaProdutos({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const usuario = await exigirLeitura("catalogo");
  const { status } = await searchParams;
  const statusValido = status && status in STATUS_PRODUTO ? status : undefined;
  const [produtos, canais, contagem] = await Promise.all([
    listarProdutos({ status: statusValido }),
    listarCanais(),
    contarProdutos(),
  ]);
  const nomes = Object.fromEntries(canais.map((c) => [c.id!, c.nome!]));
  const editar = podeEscrever(usuario.papel, "catalogo");
  const pilula = (ativo: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
      ativo ? "bg-card font-medium text-texto shadow-painel" : "text-texto-2 hover:text-texto",
    );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Produtos</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Ficha, variações, materiais, preços por canal e custo. O custo vem do motor com o
            filamento ao custo de reposição.
          </p>
        </div>
        {editar && (
          <div className="flex items-center gap-2">
            <BotaoAcao
              variant="outline"
              acao={recalcularProdutos}
              confirmar={{
                titulo: "Recalcular o custo de todos os produtos?",
                descricao:
                  "Grava um cálculo novo onde o custo mudou e abre alerta onde a margem ficou abaixo do alvo.",
                rotulo: "Recalcular",
              }}
            >
              Recalcular todos
            </BotaoAcao>
            <Button asChild variant="secondary" size="sm">
              <Link href="/catalogo/produtos/importar">Importar catálogo</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/catalogo/produtos/novo">
                <Plus className="size-4" /> Novo produto
              </Link>
            </Button>
          </div>
        )}
      </div>
      {contagem.desatualizados > 0 && (
        <Banner
          tipo="info"
          titulo={`${contagem.desatualizados} produto(s) com custo desatualizado`}
        >
          Uma compra ou mudança na ficha alterou o custo de reposição. Use Recalcular todos.
        </Banner>
      )}
      <nav
        aria-label="Situação"
        className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-superficie-2 p-1"
      >
        <Link
          href="/catalogo/produtos"
          className={pilula(!statusValido)}
          aria-current={!statusValido ? "page" : undefined}
        >
          Todos
        </Link>
        {Object.entries(STATUS_PRODUTO).map(([k, v]) => (
          <Link
            key={k}
            href={`/catalogo/produtos?status=${k}`}
            className={pilula(statusValido === k)}
            aria-current={statusValido === k ? "page" : undefined}
          >
            {v.rotulo}
          </Link>
        ))}
      </nav>
      <TabelaProdutos itens={produtos.map((p) => ({ ...p, canais: nomes }))} />
    </div>
  );
}
