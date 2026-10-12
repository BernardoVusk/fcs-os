import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { hojeSaoPaulo, formatarData, formatarDataHora } from "@/lib/formatos/data";
import {
  fluxoDe,
  listarItens,
  obterItem,
  opcoesPlanejamento,
} from "@/dados/planejamento/planejamento";
import { dataComDia, horaCurta, somarDias } from "@/dominio/planejamento/calendario";
import { atrasado } from "@/dominio/planejamento/filtros";
import {
  CANAL_PUBLICACAO_ROTULO,
  FORMATO_ROTULO,
  lerChecklist,
  lerLigacoes,
  lerMetricas,
  METRICA_ROTULO,
  PRIORIDADE_ROTULO,
  SKILL_PADRAO,
  TIPO_ITEM_ROTULO,
  type CanalPublicacao,
  type ChaveMetrica,
  type Formato,
  type Prioridade,
  type TipoItem,
} from "@/dominio/planejamento/tipos";
import { duplicarItem, excluirItem } from "@/acoes/planejamento/itens";
import { Checklist } from "@/componentes/planejamento/Checklist";
import { Relacoes } from "@/componentes/planejamento/Relacoes";
import { FormItem } from "@/componentes/planejamento/FormItem";
import { StatusItem } from "@/componentes/planejamento/StatusItem";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Item" };

export default async function PaginaItem({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const usuario = await exigirLeitura("planejamento");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const hoje = hojeSaoPaulo();
  const editar = podeEscrever(usuario.papel, "planejamento");
  const [item, opcoes] = await Promise.all([obterItem(id), opcoesPlanejamento()]);
  if (!item) notFound();
  const candidatos = editar
    ? (
        await listarItens({
          inicio: somarDias(hoje, -90),
          fim: somarDias(hoje, 365),
          incluirSemData: true,
          abertos: true,
          limite: 300,
        })
      ).map((i) => ({ id: i.id, titulo: i.titulo }))
    : [];
  const checklist = lerChecklist(item.checklist);
  const links = lerLigacoes(item.links);
  const referencias = lerLigacoes(item.referencias);
  const metricas = lerMetricas(item.metricas);
  const tarde = atrasado(item, hoje);
  const skill = item.formato ? SKILL_PADRAO[item.formato as Formato] : null;
  const modoEditar = editar && sp.editar === "1";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-texto-3">
            <Link href="/planejamento" className="hover:underline">
              Planejamento
            </Link>
            <span>·</span>
            <span>{TIPO_ITEM_ROTULO[item.tipo as TipoItem]}</span>
            {item.formato && <span>· {FORMATO_ROTULO[item.formato as Formato]}</span>}
            {item.canal_publicacao && (
              <span>· {CANAL_PUBLICACAO_ROTULO[item.canal_publicacao as CanalPublicacao]}</span>
            )}
          </div>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
            {item.titulo}
          </h1>
          <p className={`numeros mt-1 text-sm ${tarde ? "text-erro" : "text-texto-2"}`}>
            {item.prazo ? `Prazo ${dataComDia(item.prazo)}` : "Sem prazo"}
            {item.horario && ` às ${horaCurta(item.horario)}`}
            {item.inicio && ` · início ${formatarData(item.inicio)}`}
            {tarde && " · atrasado"}
            {item.concluido_em && ` · concluído em ${formatarData(item.concluido_em)}`}
            {item.publicado_em && ` · publicado em ${formatarData(item.publicado_em)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusItem
            id={item.id}
            status={item.status}
            fluxo={fluxoDe(opcoes.fluxos, item.tipo)}
            editar={editar}
          />
          {editar && !modoEditar && (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/planejamento/itens/${item.id}?editar=1`}>Editar</Link>
            </Button>
          )}
          {editar && (
            <BotaoAcao variant="outline" acao={duplicarItem.bind(null, item.id)}>
              Duplicar
            </BotaoAcao>
          )}
          {usuario.papel === "dono" && (
            <BotaoAcao
              variant="destructive"
              acao={excluirItem.bind(null, item.id)}
              confirmar={{
                titulo: "Apagar este item?",
                descricao:
                  "Histórico e relações vão junto. Para só tirar da frente, mude o status para cancelado.",
                rotulo: "Apagar",
              }}
            >
              Apagar
            </BotaoAcao>
          )}
        </div>
      </div>

      {modoEditar ? (
        <div className="rounded-2xl bg-card p-5 shadow-painel">
          <FormItem item={item} opcoes={opcoes} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            {(item.briefing || item.cta || item.legenda) && (
              <section className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
                {item.briefing && (
                  <div>
                    <h2 className="mb-1 text-xs font-medium tracking-wide text-texto-3 uppercase">
                      Briefing
                    </h2>
                    <p className="text-sm whitespace-pre-line">{item.briefing}</p>
                  </div>
                )}
                {item.cta && (
                  <div>
                    <h2 className="mb-1 text-xs font-medium tracking-wide text-texto-3 uppercase">
                      CTA
                    </h2>
                    <p className="text-sm">{item.cta}</p>
                  </div>
                )}
                {item.legenda && (
                  <div>
                    <h2 className="mb-1 text-xs font-medium tracking-wide text-texto-3 uppercase">
                      Legenda
                    </h2>
                    <p className="text-sm whitespace-pre-line text-texto-2">{item.legenda}</p>
                  </div>
                )}
              </section>
            )}
            <section className="rounded-2xl bg-card p-5 shadow-painel">
              <h2 className="mb-3 text-xs font-medium tracking-wide text-texto-3 uppercase">
                Checklist
              </h2>
              <Checklist itemId={item.id} itens={checklist} editar={editar} />
            </section>
            {item.observacoes && (
              <section className="rounded-2xl bg-card p-5 shadow-painel">
                <h2 className="mb-1 text-xs font-medium tracking-wide text-texto-3 uppercase">
                  Observações
                </h2>
                <p className="text-sm whitespace-pre-line text-texto-2">{item.observacoes}</p>
              </section>
            )}
            <section className="rounded-2xl bg-card p-5 shadow-painel">
              <h2 className="mb-3 text-xs font-medium tracking-wide text-texto-3 uppercase">
                Relações
              </h2>
              <Relacoes item={item} candidatos={candidatos} editar={editar} />
              {(item.pai || item.filhos.length > 0) && (
                <div className="mt-4 space-y-1 text-sm">
                  {item.pai && (
                    <p>
                      <span className="text-xs text-texto-3">parte de </span>
                      <Link href={`/planejamento/itens/${item.pai.id}`} className="hover:underline">
                        {item.pai.titulo}
                      </Link>
                    </p>
                  )}
                  {item.filhos.map((f) => (
                    <p key={f.id}>
                      <span className="text-xs text-texto-3">contém </span>
                      <Link href={`/planejamento/itens/${f.id}`} className="hover:underline">
                        {f.titulo}
                      </Link>
                      {f.prazo && (
                        <span className="numeros ml-1 text-xs text-texto-3">
                          {formatarData(f.prazo)}
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              )}
            </section>
          </div>
          <aside className="space-y-6">
            <section className="space-y-2 rounded-2xl bg-card p-5 text-sm shadow-painel">
              <h2 className="text-xs font-medium tracking-wide text-texto-3 uppercase">Ficha</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-texto-3">Prioridade</dt>
                <dd className={item.prioridade === "alta" ? "font-medium text-alerta" : ""}>
                  {PRIORIDADE_ROTULO[item.prioridade as Prioridade]}
                </dd>
                {item.responsavel && (
                  <>
                    <dt className="text-texto-3">Responsável</dt>
                    <dd>{item.responsavel}</dd>
                  </>
                )}
                {item.campanha && (
                  <>
                    <dt className="text-texto-3">Campanha</dt>
                    <dd>
                      <Link
                        href={`/planejamento/lista?campanha=${item.campanha_id}`}
                        className="hover:underline"
                      >
                        {item.campanha.nome}
                      </Link>
                    </dd>
                  </>
                )}
                {item.produto && (
                  <>
                    <dt className="text-texto-3">Produto</dt>
                    <dd>
                      <Link
                        href={`/catalogo/produtos/${item.produto_id}`}
                        className="hover:underline"
                      >
                        {item.produto.nome}
                      </Link>
                    </dd>
                  </>
                )}
                {item.tags.length > 0 && (
                  <>
                    <dt className="text-texto-3">Tags</dt>
                    <dd className="flex flex-wrap gap-1">
                      {item.tags.map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </dd>
                  </>
                )}
                <dt className="text-texto-3">Origem</dt>
                <dd>{item.origem}</dd>
              </dl>
              {skill && (
                <p className="mt-2 rounded-lg bg-superficie-2 px-3 py-2 font-mono text-xs text-texto-2">
                  Claude Code: {skill} lendo o item {item.id.slice(0, 8)} (plan_obter)
                </p>
              )}
            </section>
            {(links.length > 0 || referencias.length > 0) && (
              <section className="space-y-2 rounded-2xl bg-card p-5 text-sm shadow-painel">
                <h2 className="text-xs font-medium tracking-wide text-texto-3 uppercase">
                  Links e referências
                </h2>
                <ul className="space-y-1">
                  {[...links, ...referencias].map((l, n) => (
                    <li key={n}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-acao hover:underline"
                      >
                        {l.rotulo}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {Object.keys(metricas).length > 0 && (
              <section className="space-y-2 rounded-2xl bg-card p-5 text-sm shadow-painel">
                <h2 className="text-xs font-medium tracking-wide text-texto-3 uppercase">
                  Métricas
                </h2>
                <dl className="numeros grid grid-cols-[1fr_auto] gap-y-1">
                  {(Object.keys(metricas) as ChaveMetrica[]).map((k) => (
                    <div key={k} className="contents">
                      <dt className="text-texto-3">{METRICA_ROTULO[k]}</dt>
                      <dd className="text-right">{metricas[k]}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            <section className="space-y-2 rounded-2xl bg-card p-5 text-sm shadow-painel">
              <h2 className="text-xs font-medium tracking-wide text-texto-3 uppercase">
                Histórico
              </h2>
              {item.historico.length === 0 ? (
                <p className="text-texto-3">Criado em {formatarDataHora(item.criado_em)}.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {item.historico.map((h) => (
                    <li key={h.id} className="flex flex-col">
                      <span>
                        {h.campo}: {h.de ?? "vazio"} → {h.para ?? "vazio"}
                      </span>
                      <span className="numeros text-texto-3">
                        {formatarDataHora(h.em)}
                        {h.usuario_nome && ` · ${h.usuario_nome}`}
                      </span>
                    </li>
                  ))}
                  <li className="numeros text-texto-3">
                    criado em {formatarDataHora(item.criado_em)}
                  </li>
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
