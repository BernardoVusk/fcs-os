import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarFluxos, listarModelos, listarRecorrencias } from "@/dados/planejamento/planejamento";
import {
  FormModelo,
  FormRecorrenciaPlano,
  TabelaFluxos,
  TabelaModelos,
  TabelaRecorrenciasPlano,
} from "@/componentes/planejamento/Cadastros";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Modelos" };

export default async function PaginaModelos() {
  const usuario = await exigirLeitura("planejamento");
  const [modelos, recorrencias, fluxos] = await Promise.all([
    listarModelos(),
    listarRecorrencias(),
    listarFluxos(),
  ]);
  const editar = podeEscrever(usuario.papel, "planejamento");
  const ativos = modelos
    .filter((m) => m.ativo)
    .map((m) => ({ id: m.id, nome: m.nome, tipo: m.tipo }));
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Modelos</h1>
            <p className="mt-1 max-w-2xl text-sm text-texto-2">
              Moldes de item: briefing, canal, formato, tags e checklist. Escolha o modelo ao criar
              um item e tudo vem preenchido.
            </p>
          </div>
          {editar && (
            <DialogoNovo rotulo="Novo modelo" titulo="Novo modelo">
              <FormModelo />
            </DialogoNovo>
          )}
        </div>
        <TabelaModelos modelos={modelos} editar={editar} />
      </section>
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Recorrências</h2>
            <p className="mt-1 max-w-2xl text-sm text-texto-2">
              O que se repete toda semana ou todo mês nasce de um modelo. Gerar cria os itens dos
              próximos 60 dias, um por data, sem duplicar.
            </p>
          </div>
          {editar && (
            <DialogoNovo rotulo="Nova recorrência" titulo="Nova recorrência">
              <FormRecorrenciaPlano modelos={ativos} />
            </DialogoNovo>
          )}
        </div>
        <TabelaRecorrenciasPlano itens={recorrencias} modelos={ativos} editar={editar} />
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Fluxos de status</h2>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Colunas do quadro por tipo. Status fechado não conta como pendência e carimba a
            conclusão. Só o dono altera.
          </p>
        </div>
        <TabelaFluxos fluxos={fluxos} dono={usuario.papel === "dono"} />
      </section>
    </div>
  );
}
