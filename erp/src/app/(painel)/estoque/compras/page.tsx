import Link from "next/link";
import { Plus } from "lucide-react";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarCompras } from "@/dados/estoque/compras";
import { TabelaCompras } from "@/componentes/estoque/TabelaCompras";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Compras" };

export default async function PaginaCompras() {
  const usuario = await exigirLeitura("estoque");
  const compras = await listarCompras();
  const editar = podeEscrever(usuario.papel, "estoque");
  const botaoNovo = editar ? (
    <Button asChild size="sm">
      <Link href="/estoque/compras/nova">
        <Plus className="size-4" /> Nova compra
      </Link>
    </Button>
  ) : null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Compras</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Rascunho não mexe no estoque. Ao confirmar, frete e desconto são rateados por linha,
            cada rolo vira um lote e o custo médio do insumo é recalculado.
          </p>
        </div>
        {botaoNovo}
      </div>
      <TabelaCompras compras={compras} acaoVazio={botaoNovo} />
    </div>
  );
}
