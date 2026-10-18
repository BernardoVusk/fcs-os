import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarGrupos } from "@/dados/ofertas/cadastros";
import { alternarGrupoAtivo, retirarOrigem } from "@/acoes/ofertas/cadastros";
import { FUNCAO_GRUPO, FUNCAO_GRUPO_ROTULO, type FuncaoGrupo } from "@/dominio/ofertas/status";
import { formatarDataHora } from "@/lib/formatos/data";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Selo } from "@/componentes/ofertas/Selo";
import { FormAutorizacao, FormGrupo } from "@/componentes/ofertas/FormsCadastro";
import Link from "next/link";

export const metadata = { title: "Grupos" };

export default async function PaginaGrupos({
  searchParams,
}: {
  searchParams: Promise<{ funcao?: string }>;
}) {
  const usuario = await exigirLeitura("ofertas");
  const { funcao } = await searchParams;
  const filtro = FUNCAO_GRUPO.includes(funcao as FuncaoGrupo) ? funcao : undefined;
  const grupos = await listarGrupos({ funcao: filtro });
  const escreve = podeEscrever(usuario.papel, "ofertas");
  const dono = usuario.papel === "dono";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Grupos</h1>
          <p className="mt-1 max-w-3xl text-sm text-texto-2">
            Destino recebe nossas ofertas. Origem é grupo de terceiro com autorização registrada,
            usado pelo copiador. Monitorado só é acompanhado. Grupos de números conectados entram
            sozinhos; os demais você cadastra aqui.
          </p>
        </div>
        {escreve && (
          <DialogoNovo rotulo="Cadastrar grupo" titulo="Novo grupo">
            <FormGrupo />
          </DialogoNovo>
        )}
      </div>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filtrar por função">
        <Link
          href="/ofertas/grupos"
          className={!filtro ? "font-semibold text-acao" : "text-texto-2 hover:text-texto"}
        >
          Todos
        </Link>
        {FUNCAO_GRUPO.map((f) => (
          <Link
            key={f}
            href={`/ofertas/grupos?funcao=${f}`}
            className={filtro === f ? "font-semibold text-acao" : "text-texto-2 hover:text-texto"}
          >
            {FUNCAO_GRUPO_ROTULO[f]}
          </Link>
        ))}
      </nav>
      {grupos.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum grupo"
          descricao="Cadastre os grupos de destino para publicar ofertas neles."
        />
      ) : (
        <ul className="divide-y divide-borda overflow-hidden rounded-2xl bg-card shadow-painel">
          {grupos.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1 basis-64">
                <Link href={`/ofertas/grupos/${g.id}`} className="font-medium hover:text-acao">
                  {g.nome}
                </Link>
                <p className="text-xs text-texto-3">
                  {g.cadastro === "sincronizado" ? "Sincronizado pelo número" : "Cadastro manual"}
                  {g.funcao === "origem" && g.autorizado_em
                    ? ` · autorizado em ${formatarDataHora(g.autorizado_em)}: ${g.autorizacao_descricao}`
                    : ""}
                </p>
              </div>
              <Selo
                tom={g.funcao === "destino" ? "info" : g.funcao === "origem" ? "alerta" : "neutro"}
              >
                {FUNCAO_GRUPO_ROTULO[g.funcao]}
              </Selo>
              {!g.ativo && <Selo tom="neutro">Inativo</Selo>}
              {escreve && g.funcao !== "origem" && (
                <DialogoNovo rotulo="Editar" titulo={`Editar ${g.nome}`}>
                  <FormGrupo grupo={g} />
                </DialogoNovo>
              )}
              {dono && g.funcao !== "origem" && (
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
      )}
    </div>
  );
}
