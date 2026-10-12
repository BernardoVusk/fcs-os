import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Lock, Pencil } from "lucide-react";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import {
  categoriasDeConhecimento,
  listarAnexos,
  listarConhecimentos,
  listarRelacoes,
  listarVersoes,
  obterConhecimento,
} from "@/dados/conhecimento";
import { alterarStatusConhecimento, alternarValidado } from "@/acoes/conhecimento";
import {
  TIPO_CONHECIMENTO_ROTULO,
  type EstruturaDecisao,
  type TipoConhecimento,
} from "@/dominio/conhecimento/tipos";
import { formatarDataHora } from "@/lib/formatos/data";
import { Markdown } from "@/componentes/conhecimento/Markdown";
import { Tags } from "@/componentes/conhecimento/Tags";
import { Anexos, Relacoes, Versoes } from "@/componentes/conhecimento/PainelLateral";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";

export default async function PaginaConhecimentoDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirLeitura("conhecimento");
  const { id } = await params;
  const registro = await obterConhecimento(id);
  if (!registro) notFound();
  const [versoes, relacoes, anexos, categorias, candidatos] = await Promise.all([
    listarVersoes(registro.id),
    listarRelacoes(registro.id),
    listarAnexos(registro.id),
    categoriasDeConhecimento(),
    listarConhecimentos({ limite: 100 }),
  ]);
  const editar = podeEscrever(usuario.papel, "conhecimento");
  const categoria = categorias.find((c) => c.id === registro.categoria_id)?.nome;
  const decisao =
    registro.tipo === "decisao" ? ((registro.estrutura ?? null) as EstruturaDecisao | null) : null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-texto-3">
            <Badge variant="outline" className="text-texto-2">
              {TIPO_CONHECIMENTO_ROTULO[registro.tipo as TipoConhecimento]}
            </Badge>
            {categoria && <span>{categoria}</span>}
            {registro.modulo && <span>módulo {registro.modulo}</span>}
            {registro.status !== "ativo" && (
              <Badge variant="secondary">
                {registro.status === "rascunho" ? "Rascunho" : "Arquivado"}
              </Badge>
            )}
            {registro.confidencialidade === "restrito" && (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3.5" aria-hidden="true" /> restrito
              </span>
            )}
          </div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            {registro.titulo}
          </h1>
          {registro.resumo && <p className="max-w-2xl text-sm text-texto-2">{registro.resumo}</p>}
          <Tags tags={registro.tags} />
        </div>
        {editar && (
          <div className="flex flex-wrap items-center gap-2">
            <BotaoAcao acao={alternarValidado.bind(null, registro.id)} variant="secondary">
              <CheckCircle2 className="size-4" />{" "}
              {registro.validado ? "Remover validação" : "Marcar validado"}
            </BotaoAcao>
            {registro.status === "arquivado" ? (
              <BotaoAcao
                acao={alterarStatusConhecimento.bind(null, registro.id, "ativo")}
                variant="secondary"
              >
                Reativar
              </BotaoAcao>
            ) : (
              <BotaoAcao
                acao={alterarStatusConhecimento.bind(null, registro.id, "arquivado")}
                variant="ghost"
                confirmar={{
                  titulo: "Arquivar este conhecimento?",
                  descricao: "Sai das listas e da busca; o histórico continua acessível.",
                }}
              >
                Arquivar
              </BotaoAcao>
            )}
            <Button asChild size="sm">
              <Link href={`/conhecimento/${registro.id}/editar`}>
                <Pencil className="size-4" /> Editar
              </Link>
            </Button>
          </div>
        )}
      </div>
      {registro.validado && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-sucesso/15 px-3 py-1 text-xs font-medium text-sucesso">
          <CheckCircle2 className="size-3.5" aria-hidden="true" /> Validado em{" "}
          {formatarDataHora(registro.validado_em)}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="rounded-2xl bg-card p-6 shadow-painel">
          {decisao?.decisao && (
            <dl className="mb-6 grid gap-3 rounded-xl bg-superficie-2/60 p-4 text-sm sm:grid-cols-[8rem_1fr]">
              {decisao.contexto && (
                <>
                  <dt className="text-texto-3">Contexto</dt>
                  <dd className="text-texto-2">{decisao.contexto}</dd>
                </>
              )}
              {decisao.alternativas?.length > 0 && (
                <>
                  <dt className="text-texto-3">Alternativas</dt>
                  <dd>
                    <ul className="list-disc pl-5 text-texto-2">
                      {decisao.alternativas.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </dd>
                </>
              )}
              <dt className="text-texto-3">Decisão</dt>
              <dd className="font-medium">{decisao.decisao}</dd>
              {decisao.consequencias && (
                <>
                  <dt className="text-texto-3">Consequências</dt>
                  <dd className="text-texto-2">{decisao.consequencias}</dd>
                </>
              )}
            </dl>
          )}
          <Markdown texto={registro.conteudo} />
        </article>
        <aside className="space-y-4">
          <section className="rounded-2xl bg-card p-4 shadow-painel text-sm">
            <dl className="grid grid-cols-[6rem_1fr] gap-y-1.5">
              <dt className="text-texto-3">Origem</dt>
              <dd>
                {registro.origem === "claude_code"
                  ? "Claude Code"
                  : registro.origem === "importacao"
                    ? "Importação"
                    : "Manual"}
              </dd>
              {registro.referencia && (
                <>
                  <dt className="text-texto-3">Referência</dt>
                  <dd className="break-words">{registro.referencia}</dd>
                </>
              )}
              {registro.projeto && (
                <>
                  <dt className="text-texto-3">Projeto</dt>
                  <dd>{registro.projeto}</dd>
                </>
              )}
              <dt className="text-texto-3">Criado</dt>
              <dd className="numeros">{formatarDataHora(registro.criado_em)}</dd>
              <dt className="text-texto-3">Atualizado</dt>
              <dd className="numeros">{formatarDataHora(registro.atualizado_em)}</dd>
              <dt className="text-texto-3">Slug</dt>
              <dd className="font-mono text-xs break-all">{registro.slug}</dd>
            </dl>
          </section>
          <Relacoes
            id={registro.id}
            relacoes={relacoes}
            candidatos={candidatos.filter((c) => c.id !== registro.id)}
            editar={editar}
          />
          <Anexos id={registro.id} anexos={anexos} editar={editar} />
          <Versoes versoes={versoes} atual={registro.versao} />
        </aside>
      </div>
    </div>
  );
}
