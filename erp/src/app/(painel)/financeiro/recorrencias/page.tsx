import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import {
  listarCategoriasFinanceiras,
  listarContas,
  listarRecorrencias,
} from "@/dados/financeiro/financeiro";
import { gerarRecorrencias } from "@/acoes/financeiro/lancamentos";
import { FormRecorrencia, TabelaRecorrencias } from "@/componentes/financeiro/Cadastros";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";

export const metadata = { title: "Recorrências" };

export default async function PaginaRecorrencias() {
  const usuario = await exigirLeitura("financeiro");
  const [itens, contas, categorias] = await Promise.all([
    listarRecorrencias(),
    listarContas(),
    listarCategoriasFinanceiras(),
  ]);
  const editar = podeEscrever(usuario.papel, "financeiro");
  const opContas = contas.filter((c) => c.ativo).map((c) => ({ id: c.id!, nome: c.nome! }));
  const opCategorias = categorias
    .filter((c) => c.ativo)
    .map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Recorrências</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Modelos do que se repete. Gerar cria os lançamentos planejados dos próximos 3 meses, um
            por competência; mudar o modelo só afeta os ainda não realizados.
          </p>
        </div>
        {editar && (
          <div className="flex items-center gap-2">
            <BotaoAcao variant="secondary" acao={gerarRecorrencias}>
              Gerar próximos 3 meses
            </BotaoAcao>
            <DialogoNovo rotulo="Nova recorrência" titulo="Nova recorrência">
              <FormRecorrencia contas={opContas} categorias={opCategorias} />
            </DialogoNovo>
          </div>
        )}
      </div>
      <TabelaRecorrencias
        itens={itens}
        contas={opContas}
        categorias={opCategorias}
        editar={editar}
      />
    </div>
  );
}
