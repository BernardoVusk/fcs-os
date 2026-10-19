import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import {
  contarProblemas,
  destinosDaFila,
  itensDaFila,
  obterFila,
  problemasDaFila,
} from "@/dados/ofertas/filas";
import { gruposDestino, listarModelos } from "@/dados/ofertas/cadastros";
import { listarNumeros } from "@/dados/ofertas/whatsapp";
import { excluirFila } from "@/acoes/ofertas/filas";
import { previaLote } from "@/dominio/ofertas/fila";
import { PLATAFORMA_ROTULO, lerPlataforma } from "@/dominio/ofertas/plataformas";
import {
  MOTIVO_ROTULO,
  STATUS_FILA_ROTULO,
  STATUS_PUBLICACAO_ROTULO,
  TOM_PUBLICACAO,
  type StatusPublicacao,
} from "@/dominio/ofertas/status";
import { formatarDataHora, isoParaLocal } from "@/lib/formatos/data";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Banner } from "@/componentes/painel/Banner";
import { Selo } from "@/componentes/ofertas/Selo";
import {
  AcoesItem,
  BotoesStatusFila,
  Destinos,
  FalhasEIncertos,
  FormFila,
  IncluirItens,
} from "@/componentes/ofertas/Filas";

export const metadata = { title: "Fila" };

const ABAS = [
  { chave: "itens", rotulo: "Itens" },
  { chave: "grupos", rotulo: "Grupos e configuração" },
  { chave: "falhas", rotulo: "Falhas e incertos" },
] as const;

export default async function PaginaFila({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const usuario = await exigirLeitura("ofertas");
  const { id } = await params;
  const { aba = "itens" } = await searchParams;
  const fila = await obterFila(id);
  if (!fila) notFound();
  const [itens, destinos, grupos, numeros, modelos, problemas, nProblemas] = await Promise.all([
    itensDaFila(id, fila.rodada),
    destinosDaFila(id),
    gruposDestino(),
    listarNumeros(),
    listarModelos(),
    aba === "falhas" ? problemasDaFila(id) : Promise.resolve([]),
    contarProblemas(id),
  ]);
  const escreve = podeEscrever(usuario.papel, "ofertas");
  const ativos = itens.filter((i) => i.ativo);
  const p = previaLote({
    itens: ativos.length,
    grupos: destinos.length,
    intervaloSegundos: fila.intervalo_segundos,
    janela: { inicio: fila.janela_inicio, fim: fila.janela_fim },
    inicio: fila.inicio_em ? new Date(fila.inicio_em) : new Date(),
  });
  const textoPrevia = `${p.itens} oferta(s) x ${p.grupos} grupo(s) = ${p.mensagens} mensagem(ns), uma oferta a cada ${Math.round(fila.intervalo_segundos / 60)} min entre ${fila.janela_inicio.slice(0, 5)} e ${fila.janela_fim.slice(0, 5)}. ${p.terminaEm ? `Termina por volta de ${formatarDataHora(p.terminaEm)}.` : p.dias > 1 ? `Leva cerca de ${p.dias} dias.` : ""} ${fila.numero ? `Sai pelo número ${fila.numero.rotulo}, dentro dos limites dele.` : "Modo manual: cada envio aparece em Publicar."}`;
  const numeroFila = numeros.find((n) => n.id === fila.numero_id);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{fila.nome}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-texto-2">
            <Selo
              tom={
                fila.status === "ativa"
                  ? "sucesso"
                  : fila.status === "pausada"
                    ? "alerta"
                    : "neutro"
              }
            >
              {STATUS_FILA_ROTULO[fila.status]}
            </Selo>
            Rodada {fila.rodada || "não iniciada"} ·{" "}
            {fila.numero ? `número ${fila.numero.rotulo}` : "manual"}
          </p>
        </div>
        {escreve && <BotoesStatusFila id={id} status={fila.status} previa={textoPrevia} />}
      </div>
      <p className="rounded-xl bg-superficie-2 p-3 text-sm">{textoPrevia}</p>
      {numeroFila && numeroFila.estado?.status !== "conectado" && fila.status === "ativa" && (
        <Banner tipo="alerta" titulo="Número desconectado">
          Os envios desta fila ficam esperando até {numeroFila.rotulo} reconectar. Nada é perdido.
        </Banner>
      )}
      <nav className="flex gap-4 border-b border-borda text-sm" aria-label="Seções da fila">
        {ABAS.map((a) => (
          <Link
            key={a.chave}
            href={`/ofertas/filas/${id}?aba=${a.chave}`}
            aria-current={aba === a.chave ? "page" : undefined}
            className={
              aba === a.chave
                ? "border-b-2 border-acao pb-2 font-medium"
                : "pb-2 text-texto-2 hover:text-texto"
            }
          >
            {a.rotulo}
            {a.chave === "falhas" && nProblemas > 0 ? ` (${nProblemas})` : ""}
          </Link>
        ))}
      </nav>

      {aba === "itens" && (
        <div className="space-y-5">
          {escreve && fila.status !== "encerrada" && (
            <section className="rounded-2xl bg-card p-5 shadow-painel" aria-label="Incluir">
              <IncluirItens id={id} />
            </section>
          )}
          {itens.length === 0 ? (
            <EstadoVazio
              titulo="Fila vazia"
              descricao="Cole links ou importe o CSV da Shopee. Ofertas salvas entram por Gerar oferta > Adicionar à fila."
            />
          ) : (
            <ol className="divide-y divide-borda overflow-hidden rounded-2xl bg-card shadow-painel">
              {itens.map((i, n) => {
                const plataforma = lerPlataforma(i.oferta?.plataforma ?? i.cupom?.plataforma);
                const st = i.ultima?.status as StatusPublicacao | undefined;
                return (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                    <span className="numeros w-6 text-texto-3">{n + 1}</span>
                    <div className="min-w-0 flex-1 basis-64">
                      {i.oferta ? (
                        <Link
                          href={`/ofertas/gerar?id=${i.oferta.id}`}
                          className="font-medium hover:text-acao"
                        >
                          {i.oferta.titulo ?? "Sem nome: complete os dados"}
                        </Link>
                      ) : (
                        <span className="font-medium">Cupom {i.cupom?.codigo ?? ""}</span>
                      )}
                      <p className="text-xs text-texto-3">
                        {plataforma ? PLATAFORMA_ROTULO[plataforma] : ""}
                        {i.oferta
                          ? ` · ${i.oferta.preco_atual ? formatarMoeda(i.oferta.preco_atual) : "preço não informado"}`
                          : ""}
                        {i.oferta?.link_colado ? " · link colado" : ""}
                        {i.texto_editado ? " · texto próprio" : ""}
                      </p>
                    </div>
                    {st ? (
                      <Selo tom={TOM_PUBLICACAO[st] ?? "neutro"}>
                        {STATUS_PUBLICACAO_ROTULO[st] ?? st}{" "}
                        {i.ultima ? `${i.ultima.enviados}/${i.ultima.total}` : ""}
                      </Selo>
                    ) : (
                      <Selo tom="neutro">{fila.status === "ativa" ? "Na fila" : "Rascunho"}</Selo>
                    )}
                    {escreve && <AcoesItem filaId={id} itemId={i.id} texto={i.texto_editado} />}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {aba === "grupos" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section
            className="space-y-3 rounded-2xl bg-card p-5 shadow-painel"
            aria-label="Grupos de destino"
          >
            <h2 className="text-base font-semibold">Grupos de destino</h2>
            {escreve ? (
              <Destinos
                id={id}
                grupos={grupos.map((g) => ({ id: g.id, nome: g.nome, funcao: g.funcao }))}
                marcados={destinos}
              />
            ) : (
              <p className="text-sm text-texto-2">{destinos.length} grupo(s).</p>
            )}
          </section>
          <section
            className="space-y-3 rounded-2xl bg-card p-5 shadow-painel"
            aria-label="Configuração"
          >
            <h2 className="text-base font-semibold">Configuração</h2>
            {escreve ? (
              <DialogoNovo rotulo="Editar configuração" titulo={`Configuração de ${fila.nome}`}>
                <FormFila
                  id={id}
                  fila={{ ...fila, inicio_local: isoParaLocal(fila.inicio_em) }}
                  numeros={numeros.map((n) => ({
                    id: n.id,
                    rotulo: n.rotulo,
                    conectado: n.estado?.status === "conectado",
                  }))}
                  modelos={modelos
                    .filter((m) => m.ativo && m.tipo === "oferta")
                    .map((m) => ({ id: m.id, nome: m.nome }))}
                />
              </DialogoNovo>
            ) : null}
            {escreve && fila.status !== "ativa" && (
              <BotaoAcao
                acao={excluirFila.bind(null, id)}
                variant="ghost"
                confirmar={{
                  titulo: "Excluir esta fila?",
                  descricao: "Itens e configuração somem. Os envios já feitos ficam no histórico.",
                  rotulo: "Excluir",
                }}
              >
                Excluir fila
              </BotaoAcao>
            )}
          </section>
        </div>
      )}

      {aba === "falhas" &&
        (problemas.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma falha"
            descricao="Envios que falharam ou ficaram incertos aparecem aqui."
          />
        ) : (
          <FalhasEIncertos
            escreve={escreve}
            envios={problemas.map((e) => ({
              id: e.id,
              status: e.status,
              grupo: e.grupo?.nome ?? "grupo",
              item:
                e.publicacao?.oferta?.titulo ??
                (e.publicacao?.cupom ? `Cupom ${e.publicacao.cupom.codigo ?? ""}` : "Oferta"),
              motivo: (e.motivo && MOTIVO_ROTULO[e.motivo]) ?? e.motivo ?? "sem motivo",
              erro: e.erro_detalhe,
              quando: formatarDataHora(e.atualizado_em),
            }))}
          />
        ))}
    </div>
  );
}
