import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarClientes } from "@/dados/vendas/pedidos";
import { listarCanais } from "@/dados/configuracoes/canais";
import { FormCliente, TabelaClientes } from "@/componentes/vendas/Clientes";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Clientes" };

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string; destaque?: string }>;
}) {
  const usuario = await exigirLeitura("vendas");
  const { novo, destaque } = await searchParams;
  const [clientes, canais] = await Promise.all([listarClientes(), listarCanais()]);
  const editar = podeEscrever(usuario.papel, "vendas");
  const opCanais = canais.map((c) => ({ id: c.id!, nome: c.nome! }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Cadastro mínimo. Dados pessoais podem ser removidos a qualquer momento sem apagar o
            histórico de pedidos.
          </p>
        </div>
        {editar && (
          <DialogoNovo rotulo="Novo cliente" titulo="Novo cliente" abrirInicial={novo === "1"}>
            <FormCliente canais={opCanais} />
          </DialogoNovo>
        )}
      </div>
      <TabelaClientes clientes={clientes} canais={opCanais} editar={editar} destaque={destaque} />
    </div>
  );
}
