import { redirect } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { opcoesDoPedido } from "@/dados/vendas/opcoes";
import { FormPedido } from "@/componentes/vendas/FormPedido";

export const metadata = { title: "Novo pedido" };

export default async function PaginaNovoPedido() {
  const usuario = await exigirLeitura("vendas");
  if (!podeEscrever(usuario.papel, "vendas")) redirect("/vendas/pedidos");
  const opcoes = await opcoesDoPedido();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Novo pedido</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          Taxas vêm do canal vigente e podem ser ajustadas. O resumo embaixo mostra o que fica
          depois das taxas antes de salvar.
        </p>
      </div>
      <FormPedido {...opcoes} />
    </div>
  );
}
