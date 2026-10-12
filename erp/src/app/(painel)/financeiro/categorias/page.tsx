import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarCategoriasFinanceiras } from "@/dados/financeiro/financeiro";
import {
  FormCategoriaFinanceira,
  TabelaCategoriasFinanceiras,
} from "@/componentes/financeiro/Cadastros";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Categorias financeiras" };

export default async function PaginaCategoriasFinanceiras() {
  const usuario = await exigirLeitura("financeiro");
  const categorias = await listarCategoriasFinanceiras();
  const editar = podeEscrever(usuario.papel, "financeiro");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            Categorias financeiras
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Receitas e despesas, fixas ou variáveis. As embutidas no custo entram no caixa mas ficam
            fora da DRE para não contar duas vezes.
          </p>
        </div>
        {editar && (
          <DialogoNovo rotulo="Nova categoria" titulo="Nova categoria">
            <FormCategoriaFinanceira />
          </DialogoNovo>
        )}
      </div>
      <TabelaCategoriasFinanceiras categorias={categorias} editar={editar} />
    </div>
  );
}
