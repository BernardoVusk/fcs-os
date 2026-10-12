import Link from "next/link";
import { Plus } from "lucide-react";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarPedidos, listarStatus } from "@/dados/vendas/pedidos";
import { TabelaPedidos } from "@/componentes/vendas/Pedidos";
import { Button } from "@/componentes/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Pedidos" };

export default async function PaginaPedidos({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const usuario = await exigirLeitura("vendas");
  const { status } = await searchParams;
  const [lista, pedidos] = await Promise.all([
    listarStatus(),
    listarPedidos({
      statusCodigo: status === "abertos" ? undefined : status,
      abertos: status === "abertos",
    }),
  ]);
  const editar = podeEscrever(usuario.papel, "vendas");
  const pilula = (ativo: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors duration-150",
      ativo ? "bg-card font-medium text-texto shadow-painel" : "text-texto-2 hover:text-texto",
    );
  const botaoNovo = editar ? (
    <Button asChild size="sm">
      <Link href="/vendas/pedidos/novo">
        <Plus className="size-4" /> Novo pedido
      </Link>
    </Button>
  ) : null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Pedidos</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Pedidos manuais e importados dos canais, com resumo financeiro por pedido. Pagamento
            aprovado congela o custo; enviado baixa as peças prontas.
          </p>
        </div>
        {editar && (
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/vendas/importar">Importar CSV</Link>
            </Button>
            {botaoNovo}
          </div>
        )}
      </div>
      <nav
        aria-label="Situação"
        className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-superficie-2 p-1"
      >
        <Link
          href="/vendas/pedidos"
          className={pilula(!status)}
          aria-current={!status ? "page" : undefined}
        >
          Todos
        </Link>
        <Link
          href="/vendas/pedidos?status=abertos"
          className={pilula(status === "abertos")}
          aria-current={status === "abertos" ? "page" : undefined}
        >
          Abertos
        </Link>
        {lista
          .filter((s) => s.ativo)
          .map((s) => (
            <Link
              key={s.id}
              href={`/vendas/pedidos?status=${s.codigo}`}
              className={pilula(status === s.codigo)}
              aria-current={status === s.codigo ? "page" : undefined}
            >
              {s.nome}
            </Link>
          ))}
      </nav>
      <TabelaPedidos pedidos={pedidos} acaoVazio={botaoNovo} />
    </div>
  );
}
