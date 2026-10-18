import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { dadosGrupo, obterGrupoResumo, participacoes } from "@/dados/ofertas/whatsapp";
import { listarGrupos } from "@/dados/ofertas/cadastros";
import { vincularGrupo } from "@/acoes/ofertas/whatsapp";
import { metricasGrupo } from "@/dominio/ofertas/evasao";
import { FUNCAO_GRUPO_ROTULO, type FuncaoGrupo } from "@/dominio/ofertas/status";
import { formatarDataHora } from "@/lib/formatos/data";
import { intervaloDoPeriodo, intervaloPersonalizado } from "@/lib/formatos/periodo";
import { SeletorPeriodo, lerPeriodo } from "@/componentes/painel/SeletorPeriodo";
import { Banner } from "@/componentes/painel/Banner";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { Selo } from "@/componentes/ofertas/Selo";
import { CartoesMetricas } from "@/componentes/ofertas/MetricasGrupo";
import { FiltroDatas } from "@/componentes/ofertas/FiltroDatas";

export const metadata = { title: "Grupo" };

export default async function PaginaGrupo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  const usuario = await exigirLeitura("ofertas");
  const { id } = await params;
  const { periodo, de, ate } = await searchParams;
  const g = await obterGrupoResumo(id);
  if (!g) notFound();
  const atual = lerPeriodo(periodo);
  const personalizado = intervaloPersonalizado(de, ate);
  const { inicio, fim } = personalizado ?? intervaloDoPeriodo(atual);
  const [d, quem, manuais] = await Promise.all([
    dadosGrupo(id, g.numero_coletor_id, inicio, fim),
    participacoes(id),
    g.cadastro === "sincronizado" ? listarGrupos({ ativos: true }) : Promise.resolve([]),
  ]);
  const m = metricasGrupo({
    inicio,
    fim,
    medicoes: d.medicoes,
    eventos: d.eventos,
    lacunas: d.lacunas,
    coletaIniciadaEm: g.coleta_iniciada_em,
  });
  const escreve = podeEscrever(usuario.papel, "ofertas");
  const paraUnir = manuais.filter((x) => x.cadastro === "manual");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{g.nome}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-texto-2">
            <Selo tom="neutro">{FUNCAO_GRUPO_ROTULO[g.funcao as FuncaoGrupo] ?? g.funcao}</Selo>
            {g.cadastro === "sincronizado"
              ? "Sincronizado pelo número"
              : "Cadastro manual (sem coleta)"}
            {g.membros_atual !== null &&
              ` · ${g.membros_atual} membros em ${formatarDataHora(g.membros_medido_em)}`}
            {g.so_admins && " · só administradores enviam mensagens"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SeletorPeriodo atual={atual} base={`/ofertas/grupos/${id}`} />
          <FiltroDatas acao={`/ofertas/grupos/${id}`} de={de} ate={ate} />
        </div>
      </div>
      {personalizado && (
        <p className="text-sm text-texto-2">
          Período escolhido: {formatarDataHora(personalizado.inicio)} até{" "}
          {formatarDataHora(personalizado.fim)} (exclusive).
        </p>
      )}
      {g.cadastro === "manual" ? (
        <Banner tipo="info" titulo="Sem coleta automática">
          Grupo cadastrado à mão: membros, entradas e saídas só aparecem quando um número conectado
          participa do grupo e ele é unido a este cadastro.
        </Banner>
      ) : (
        <p className="text-sm text-texto-2">
          Coleta desde{" "}
          {g.coleta_iniciada_em ? formatarDataHora(g.coleta_iniciada_em) : "ainda não iniciada"}.
          Antes disso não há dado: nada é estimado.
        </p>
      )}
      {m.parcial && (
        <Banner tipo="alerta" titulo="Dados parciais neste período">
          Motivo: {m.motivoParcial}. Entradas e saídas desse intervalo podem estar incompletas.
        </Banner>
      )}
      <CartoesMetricas m={m} enviados={d.enviados} />
      <section className="rounded-2xl bg-card p-5 text-sm shadow-painel">
        <h2 className="mb-2 text-base font-semibold">Como cada número é calculado</h2>
        <ul className="list-disc space-y-1 pl-5 text-texto-2">
          <li>Membros no início: última medição até o início do período.</li>
          <li>Saldo: entradas observadas menos saídas observadas no período.</li>
          <li>Variação líquida: membros no fim menos membros no início.</li>
          <li>Taxa de evasão: saídas no período divididas pelos membros no início, vezes 100.</li>
          <li>
            Cliques e vendas por grupo vêm dos relatórios oficiais das plataformas (Relatórios de
            ofertas).
          </li>
        </ul>
        <p className="mt-2 text-xs text-texto-3">
          Último envio do sistema: {d.ultimoEnvio ? formatarDataHora(d.ultimoEnvio) : "nenhum"}.
          Números que participam:{" "}
          {quem.length
            ? quem
                .map((q) => `${q.numero?.rotulo ?? "número"}${q.admin ? " (admin)" : ""}`)
                .join(", ")
            : "nenhum"}
          .
        </p>
      </section>
      {escreve && g.cadastro === "sincronizado" && paraUnir.length > 0 && (
        <section className="space-y-2 rounded-2xl bg-card p-5 shadow-painel">
          <h2 className="text-base font-semibold">Unir com um cadastro manual</h2>
          <p className="text-sm text-texto-2">
            Se este grupo já estava cadastrado à mão, una para não ter dois registros.
          </p>
          <ul className="flex flex-wrap gap-2">
            {paraUnir.map((x) => (
              <li key={x.id}>
                <BotaoAcao
                  acao={vincularGrupo.bind(null, x.id, g.id)}
                  variant="outline"
                  confirmar={{
                    titulo: `Unir com ${x.nome}?`,
                    descricao:
                      "O cadastro manual recebe o vínculo com o WhatsApp e as medições; este registro sincronizado some.",
                  }}
                >
                  {x.nome}
                </BotaoAcao>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Link href="/ofertas/grupos" className="text-sm text-acao hover:underline">
        Voltar para grupos
      </Link>
    </div>
  );
}
