import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarFornecedores } from "@/dados/estoque/fornecedores";
import { TabelaFornecedores } from "@/componentes/estoque/TabelaFornecedores";
import { FormFornecedor } from "@/componentes/estoque/FormFornecedor";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Fornecedores" };

export default async function PaginaFornecedores({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string; destaque?: string }>;
}) {
  const usuario = await exigirLeitura("estoque");
  const { novo, destaque } = await searchParams;
  const fornecedores = await listarFornecedores();
  const editar = podeEscrever(usuario.papel, "estoque");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Fornecedores</h1>
          <p className="mt-1 text-sm text-texto-2">
            De quem compramos filamento, embalagem e componentes.
          </p>
        </div>
        {editar && (
          <DialogoNovo
            rotulo="Novo fornecedor"
            titulo="Novo fornecedor"
            abrirInicial={novo === "1"}
          >
            <FormFornecedor />
          </DialogoNovo>
        )}
      </div>
      <TabelaFornecedores fornecedores={fornecedores} editar={editar} destaque={destaque} />
    </div>
  );
}
