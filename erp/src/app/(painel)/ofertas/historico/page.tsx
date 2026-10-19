import { exigirLeitura } from "@/lib/auth/sessao";
import { auditoriaOfertas, historicoEnvios } from "@/dados/ofertas/relatorios";
import { listarGrupos } from "@/dados/ofertas/cadastros";
import { listarNumeros } from "@/dados/ofertas/whatsapp";
import {
  MOTIVO_ROTULO,
  STATUS_ENVIO,
  STATUS_PUBLICACAO_ROTULO,
  TOM_PUBLICACAO,
  statusExibido,
} from "@/dominio/ofertas/status";
import { ORIGEM_LINK_ROTULO, type OrigemLink } from "@/dominio/ofertas/links-afiliado";
import { PLATAFORMA_ROTULO, lerPlataforma } from "@/dominio/ofertas/plataformas";
import { formatarDataHora } from "@/lib/formatos/data";
import { intervaloDoPeriodo, intervaloPersonalizado } from "@/lib/formatos/periodo";
import { SeletorPeriodo, lerPeriodo } from "@/componentes/painel/SeletorPeriodo";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Selo } from "@/componentes/ofertas/Selo";

export const metadata = { title: "Histórico de envios" };

type Busca = {
  periodo?: string;
  de?: string;
  ate?: string;
  grupo?: string;
  numero?: string;
  status?: string;
  busca?: string;
};
const uuid = (v?: string) => (v && /^[0-9a-f-]{36}$/.test(v) ? v : null);

const ORIGEM: Record<string, string> = { avulsa: "Avulsa", fila: "Fila", copiador: "Copiador" };
const TABELA: Record<string, string> = {
  ofe_integracoes: "Integração",
  ofe_modelos: "Modelo",
  ofe_grupos: "Grupo",
  ofe_cupons: "Cupom",
  ofe_ofertas: "Oferta",
  ofe_numeros: "Número",
  ofe_filas: "Fila",
  ofe_filas_itens: "Item de fila",
  ofe_automacoes: "Automação",
  ofe_cupons_regras: "Regra de cupons",
};

function camposAlterados(
  antes: Record<string, unknown> | null,
  depois: Record<string, unknown> | null,
): string {
  if (!antes || !depois) return "";
  return Object.keys(depois)
    .filter((k) => k !== "atualizado_em" && JSON.stringify(antes[k]) !== JSON.stringify(depois[k]))
    .slice(0, 8)
    .join(", ");
}

export default async function PaginaHistorico({ searchParams }: { searchParams: Promise<Busca> }) {
  const usuario = await exigirLeitura("ofertas");
  const sp = await searchParams;
  const atual = lerPeriodo(sp.periodo ?? "30d");
  const { inicio, fim } = intervaloPersonalizado(sp.de, sp.ate) ?? intervaloDoPeriodo(atual);
  const status = STATUS_ENVIO.includes(sp.status as never) ? sp.status! : null;
  const [envios, grupos, numeros, auditoria] = await Promise.all([
    historicoEnvios({
      inicio,
      fim,
      grupo: uuid(sp.grupo),
      numero: uuid(sp.numero),
      status,
      busca: sp.busca ?? null,
    }),
    listarGrupos({}),
    listarNumeros(true),
    usuario.papel === "dono" ? auditoriaOfertas(inicio, fim) : Promise.resolve([]),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            Histórico de envios
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-texto-2">
            Cada envio com quem criou, quando, de onde veio, para qual grupo, por qual número, o
            link original e o final, o texto, o resultado e as tentativas. Tokens, QR e sessões
            nunca aparecem aqui.
          </p>
        </div>
        <SeletorPeriodo atual={atual} base="/ofertas/historico" />
      </div>
      <form
        method="get"
        className="flex flex-wrap items-end gap-2 rounded-2xl bg-card p-4 shadow-painel"
        aria-label="Filtros"
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-texto-3">De</span>
          <Input type="date" name="de" defaultValue={sp.de} className="h-8 w-auto" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-texto-3">Até</span>
          <Input type="date" name="ate" defaultValue={sp.ate} className="h-8 w-auto" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-texto-3">Grupo</span>
          <SelectNativo name="grupo" defaultValue={sp.grupo ?? ""} className="h-8 w-auto max-w-48">
            <option value="">Todos</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </SelectNativo>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-texto-3">Número</span>
          <SelectNativo name="numero" defaultValue={sp.numero ?? ""} className="h-8 w-auto">
            <option value="">Todos</option>
            {numeros.map((n) => (
              <option key={n.id} value={n.id}>
                {n.rotulo}
              </option>
            ))}
          </SelectNativo>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-texto-3">Resultado</span>
          <SelectNativo name="status" defaultValue={status ?? ""} className="h-8 w-auto">
            <option value="">Todos</option>
            {STATUS_ENVIO.map((s) => (
              <option key={s} value={s}>
                {STATUS_PUBLICACAO_ROTULO[s]}
              </option>
            ))}
          </SelectNativo>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-texto-3">Texto ou link</span>
          <Input name="busca" defaultValue={sp.busca} className="h-8 w-48" />
        </label>
        <Button type="submit" size="sm" variant="outline">
          Buscar
        </Button>
      </form>

      {envios.length === 0 ? (
        <EstadoVazio titulo="Nenhum envio encontrado" descricao="Ajuste o período ou os filtros." />
      ) : (
        <ul className="space-y-2">
          {envios.map((e) => {
            const st = statusExibido(e.status as never, e.agendado_para);
            const pub = e.publicacao;
            const plataforma = lerPlataforma(pub?.oferta?.plataforma ?? pub?.cupom?.plataforma);
            return (
              <li key={e.id}>
                <details className="rounded-2xl bg-card p-4 shadow-painel">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                    <Selo tom={TOM_PUBLICACAO[st]}>{STATUS_PUBLICACAO_ROTULO[st]}</Selo>
                    <span className="font-medium">
                      {pub?.oferta?.titulo ??
                        (pub?.cupom ? `Cupom ${pub.cupom.codigo ?? ""}` : "Oferta")}
                    </span>
                    <span className="text-texto-3">
                      em {e.grupo?.nome ?? "grupo"} ·{" "}
                      {e.enviado_em
                        ? formatarDataHora(e.enviado_em)
                        : `agendado ${formatarDataHora(e.agendado_para)}`}
                    </span>
                  </summary>
                  <dl className="mt-3 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[180px_1fr]">
                    <dt className="text-texto-3">Origem</dt>
                    <dd>
                      {ORIGEM[pub?.origem ?? ""] ?? pub?.origem}
                      {pub?.fila ? ` (fila ${pub.fila.nome})` : ""} · criado por{" "}
                      {pub?.autor ?? "sistema"} em {pub ? formatarDataHora(pub.criado_em) : ""}
                    </dd>
                    <dt className="text-texto-3">Plataforma e número</dt>
                    <dd>
                      {plataforma ? PLATAFORMA_ROTULO[plataforma] : ""} ·{" "}
                      {e.modo === "manual"
                        ? "manual (você publicou)"
                        : `número ${e.numero?.rotulo ?? "removido"}`}
                    </dd>
                    <dt className="text-texto-3">URL original</dt>
                    <dd className="break-all">{pub?.oferta?.url_original ?? "sem URL"}</dd>
                    <dt className="text-texto-3">Link enviado</dt>
                    <dd className="break-all">
                      {e.link_url ?? "sem link"}
                      {e.link_origem
                        ? ` (${ORIGEM_LINK_ROTULO[e.link_origem as OrigemLink] ?? e.link_origem})`
                        : ""}
                    </dd>
                    <dt className="text-texto-3">Modelo</dt>
                    <dd>
                      {pub?.texto_editado
                        ? "Texto editado nesta postagem"
                        : (pub?.oferta?.modelo?.nome ?? "Padrão da plataforma")}
                    </dd>
                    <dt className="text-texto-3">Resultado</dt>
                    <dd>
                      {STATUS_PUBLICACAO_ROTULO[st]}
                      {e.motivo ? `: ${MOTIVO_ROTULO[e.motivo] ?? e.motivo}` : ""}
                      {e.erro_detalhe ? ` (${e.erro_detalhe})` : ""}
                      {e.wa_mensagem_id ? ` · id da mensagem ${e.wa_mensagem_id}` : ""}
                    </dd>
                    <dt className="text-texto-3">Tentativas</dt>
                    <dd>
                      {e.tentativas_lista.length === 0
                        ? e.modo === "manual"
                          ? "Envio manual"
                          : "Nenhuma"
                        : e.tentativas_lista
                            .map(
                              (t) =>
                                `${formatarDataHora(t.iniciado_em)} ${t.resultado ?? "em andamento"}${t.erro ? ` (${t.erro})` : ""}`,
                            )
                            .join(" · ")}
                    </dd>
                  </dl>
                  {e.texto_final && (
                    <pre className="mt-3 max-h-48 overflow-y-auto rounded-xl bg-superficie-2 p-3 font-sans text-xs whitespace-pre-wrap">
                      {e.texto_final}
                    </pre>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
      )}

      {usuario.papel === "dono" && (
        <section className="space-y-2" aria-label="Alterações de configuração">
          <h2 className="text-base font-semibold">Alterações de configuração do módulo</h2>
          {auditoria.length === 0 ? (
            <p className="text-sm text-texto-2">Nenhuma alteração no período.</p>
          ) : (
            <ul className="divide-y divide-borda overflow-hidden rounded-2xl bg-card text-xs shadow-painel">
              {auditoria.map((a) => (
                <li key={a.id} className="flex flex-wrap gap-2 px-4 py-2">
                  <span className="numeros text-texto-3">{formatarDataHora(a.em)}</span>
                  <span>
                    {TABELA[a.tabela] ?? a.tabela}{" "}
                    {a.acao === "insert" ? "criado" : a.acao === "delete" ? "removido" : "alterado"}
                  </span>
                  <span className="text-texto-2">
                    por {a.autor ?? (a.origem === "worker" ? "worker" : "sistema")} ({a.origem})
                  </span>
                  {a.acao === "update" && (
                    <span className="text-texto-3">{camposAlterados(a.antes, a.depois)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
