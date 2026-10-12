import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarStatus } from "@/dados/vendas/pedidos";
import { TabelaStatusPedido } from "@/componentes/vendas/StatusPedido";

export const metadata = { title: "Status de pedido" };

export default async function PaginaStatusPedido() {
  const usuario = await exigirLeitura("configuracoes");
  const lista = await listarStatus();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Status de pedido</h1>
        <p className="mt-1 max-w-2xl text-sm text-texto-2">
          Nome, ordem e cor são editáveis. Os papéis são fixos: um status inicial, um que marca pago
          e congela o custo (gera recebível) e um que baixa as peças prontas (expedição).
        </p>
      </div>
      <TabelaStatusPedido lista={lista} editar={podeEscrever(usuario.papel, "configuracoes")} />
    </div>
  );
}
