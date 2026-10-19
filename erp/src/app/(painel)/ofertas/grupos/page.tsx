import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarGruposResumo, listarNumeros } from "@/dados/ofertas/whatsapp";
import { alternarGrupoAtivo, retirarOrigem } from "@/acoes/ofertas/cadastros";
import { FUNCAO_GRUPO, FUNCAO_GRUPO_ROTULO, type FuncaoGrupo } from "@/dominio/ofertas/status";
import { formatarDataHora } from "@/lib/formatos/data";
import { formatarNumero } from "@/lib/formatos/numero";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { Button } from "@/componentes/ui/button";
import { Selo } from "@/componentes/ofertas/Selo";
import { FormAutorizacao, FormGrupo } from "@/componentes/ofertas/FormsCadastro";

export const metadata = { title: "Grupos" };

export default async function PaginaGrupos({
  searchParams,
}: {
  searchParams: Promise<{ funcao?: string; numero?: string }>;
}) {
  const usuario = await exigirLeitura("ofertas");
  const { funcao, numero } = await searchParams;
  const filtroFuncao = FUNCAO_GRUPO.includes(funcao as FuncaoGrupo) ? funcao : undefined;
  const [todos, numeros] = await Promise.all([listarGruposResumo(), listarNumeros()]);
  const grupos = todos.filter(
    (g) =>
      (!filtroFuncao || g.funcao === filtroFuncao) && (!numero || g.numero_coletor_id === numero),
  );
  const escreve = podeEscrever(usuario.papel, "ofertas");
  const dono = usuario.papel === "dono";
  const rotuloNumero = new Map(numeros.map((n) => [n.id, n.rotulo]));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Grupos</h1>
          <p className="mt-1 max-w-3xl text-sm text-texto-2">
            Destino recebe nossas ofertas. Origem é grupo de terceiro com autorização registrada,
            usado pelo copiador. Monitorado só é acompanhado. Grupos dos números conectados entram
            sozinhos, sem função; os demais você cadastra.
          </p>
        </div>
        {escreve && (
          <DialogoNovo rotulo="Cadastrar grupo" titulo="Novo grupo">
            <FormGrupo />
          </DialogoNovo>
        )}
      </div>
      <form method="get" className="flex flex-wrap items-end gap-2" aria-label="Filtros">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-texto-3">Função</span>
          <SelectNativo name="funcao" defaultValue={filtroFuncao ?? ""} className="h-8 w-auto">
            <option value="">Todas</option>
            {FUNCAO_GRUPO.map((f) => (
              <option key={f} value={f}>
                {FUNCAO_GRUPO_ROTULO[f]}
              </option>
            ))}
          </SelectNativo>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-texto-3">Número que coleta</span>
          <SelectNativo name="numero" defaultValue={numero ?? ""} className="h-8 w-auto">
            <option value="">Todos</option>
            {numeros.map((n) => (
              <option key={n.id} value={n.id}>
                {n.rotulo}
              </option>
            ))}
          </SelectNativo>
        </label>
        <Button type="submit" size="sm" variant="outline">
          Filtrar
        </Button>
      </form>
      {grupos.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum grupo"
          descricao="Cadastre os grupos de destino ou conecte um número para sincronizar."
        />
      ) : (
        <>
          <form
            id="comparar"
            method="get"
            action="/ofertas/grupos/comparar"
            className="flex items-center gap-2 text-sm"
          >
            <Button type="submit" size="sm" variant="secondary">
              Comparar marcados
            </Button>
            <span className="text-xs text-texto-3">Marque até 12 grupos.</span>
          </form>
          <ul className="divide-y divide-borda overflow-hidden rounded-2xl bg-card shadow-painel">
            {grupos.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <input
                  type="checkbox"
                  name="ids"
                  value={g.id}
                  form="comparar"
                  aria-label={`Comparar ${g.nome}`}
                  className="size-4 accent-acao"
                />
                <div className="min-w-0 flex-1 basis-64">
                  <Link href={`/ofertas/grupos/${g.id}`} className="font-medium hover:text-acao">
                    {g.nome}
                  </Link>
                  <p className="text-xs text-texto-3">
                    {g.cadastro === "sincronizado"
                      ? `Coletado por ${g.numero_coletor_id ? (rotuloNumero.get(g.numero_coletor_id) ?? "número removido") : "nenhum número"}`
                      : "Cadastro manual"}
                    {g.membros_atual !== null
                      ? ` · ${formatarNumero(g.membros_atual, 0)} membros (${formatarDataHora(g.membros_medido_em)})`
                      : " · membros sem dados"}
                    {g.funcao === "origem" && g.autorizado_em
                      ? ` · autorizado em ${formatarDataHora(g.autorizado_em)}`
                      : ""}
                  </p>
                </div>
                <Selo
                  tom={
                    g.funcao === "destino" ? "info" : g.funcao === "origem" ? "alerta" : "neutro"
                  }
                >
                  {FUNCAO_GRUPO_ROTULO[g.funcao as FuncaoGrupo] ?? g.funcao}
                </Selo>
                {!g.ativo && <Selo tom="neutro">Inativo</Selo>}
                {escreve && g.funcao !== "origem" && (
                  <DialogoNovo rotulo="Editar" titulo={`Editar ${g.nome}`}>
                    <FormGrupo grupo={g} />
                  </DialogoNovo>
                )}
                {dono && g.funcao !== "origem" && g.cadastro === "sincronizado" && (
                  <DialogoNovo rotulo="Marcar como origem" titulo={`Origem autorizada: ${g.nome}`}>
                    <FormAutorizacao grupoId={g.id} />
                  </DialogoNovo>
                )}
                {dono && g.funcao === "origem" && (
                  <BotaoAcao
                    acao={retirarOrigem.bind(null, g.id)}
                    variant="outline"
                    confirmar={{
                      titulo: "Deixar de usar como origem?",
                      descricao: "Automações do copiador com este grupo param.",
                    }}
                  >
                    Retirar origem
                  </BotaoAcao>
                )}
                {escreve && (
                  <BotaoAcao acao={alternarGrupoAtivo.bind(null, g.id, !g.ativo)} variant="ghost">
                    {g.ativo ? "Desativar" : "Reativar"}
                  </BotaoAcao>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
