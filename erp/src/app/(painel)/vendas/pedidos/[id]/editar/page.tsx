import { notFound, redirect } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { obterPedido } from "@/dados/vendas/pedidos";
import { opcoesDoPedido } from "@/dados/vendas/opcoes";
import { FormPedido } from "@/componentes/vendas/FormPedido";

export const metadata = { title: "Editar pedido" };

export default async function PaginaEditarPedido({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirLeitura("vendas");
  const { id } = await params;
  const pedido = await obterPedido(id);
  if (!pedido) notFound();
  if (!podeEscrever(usuario.papel, "vendas") || pedido.status?.fechado || pedido.data_envio)
    redirect(`/vendas/pedidos/${id}`);
  const opcoes = await opcoesDoPedido();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
          Editar {pedido.codigo}
        </h1>
        <p className="mt-1 text-sm text-texto-2">
          Os itens são substituídos pelos que estiverem aqui ao salvar. Custo estimado congelado não
          muda.
        </p>
      </div>
      <FormPedido {...opcoes} pedido={pedido} />
    </div>
  );
}
