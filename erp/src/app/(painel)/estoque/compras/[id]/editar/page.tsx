import { notFound, redirect } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { obterCompra } from "@/dados/estoque/compras";
import { listarFornecedores } from "@/dados/estoque/fornecedores";
import { listarInsumosAtivos, listarUnidades } from "@/dados/estoque/insumos";
import { FormCompra } from "@/componentes/estoque/FormCompra";

export const metadata = { title: "Editar compra" };

export default async function PaginaEditarCompra({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirLeitura("estoque");
  const { id } = await params;
  const compra = await obterCompra(id);
  if (!compra) notFound();
  if (!podeEscrever(usuario.papel, "estoque") || compra.status !== "rascunho")
    redirect(`/estoque/compras/${id}`);
  const [fornecedores, insumos, unidades] = await Promise.all([
    listarFornecedores(false),
    listarInsumosAtivos(),
    listarUnidades(),
  ]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Editar compra</h1>
        <p className="mt-1 text-sm text-texto-2">
          Rascunho. Os itens são substituídos pelos que estiverem aqui ao salvar.
        </p>
      </div>
      <FormCompra
        fornecedores={fornecedores}
        insumos={insumos}
        unidades={unidades}
        compra={compra}
      />
    </div>
  );
}
