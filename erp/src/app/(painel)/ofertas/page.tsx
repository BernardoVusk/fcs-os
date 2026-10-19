import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeLer } from "@/lib/auth/papeis";
import { resumoPainelOfertas } from "@/dados/ofertas/painel";
import { PLATAFORMA_ROTULO, STATUS_INTEGRACAO_ROTULO } from "@/dominio/ofertas/plataformas";
import { formatarDataHora } from "@/lib/formatos/data";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { formatarNumero } from "@/lib/formatos/numero";
import { CartaoIndicador } from "@/componentes/painel/CartaoIndicador";
import { Banner } from "@/componentes/painel/Banner";
import { Selo } from "@/componentes/ofertas/Selo";

export const metadata = { title: "Painel de ofertas" };

const n = (v: number | undefined) => formatarNumero(v ?? 0, 0);

function Linha({
  itens,
}: {
  itens: { rotulo: string; valor: number | undefined; href: string }[];
}) {
  return (
    <ul className="mt-3 space-y-1 text-sm">
      {itens.map((i) => (
        <li key={i.rotulo}>
          <Link href={i.href} className="flex justify-between gap-2 hover:text-acao">
            <span className="text-texto-2">{i.rotulo}</span>
            <span className="numeros font-medium">{n(i.valor)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card p-5 shadow-painel" aria-label={titulo}>
      <h2 className="text-[13px] font-medium text-texto-2">{titulo}</h2>
      {children}
    </section>
  );
}

export default async function PaginaPainelOfertas() {
  const usuario = await exigirLeitura("ofertas");
  const r = await resumoPainelOfertas();
  const comErro = r.integracoes.filter(
    (i) => i.status === "erro" || i.status === "credencial_expirada",
  );
  const veCredenciais = podeLer(usuario.papel, "usuarios");
  const temNumeros = Object.values(r.numeros).reduce((s, v) => s + v, 0) > 0;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
          Painel de ofertas
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-texto-2">
          Operação dos grupos de ofertas. Números vêm só de dado registrado; cliques e comissões só
          de relatório importado das plataformas. Visualizações de mensagem não são medidas por
          nenhuma integração.
        </p>
      </div>
      {temNumeros && !r.worker.online && (
        <Banner tipo="alerta" titulo="Worker do WhatsApp sem sinal">
          {r.worker.ultimo
            ? `Último sinal ${formatarDataHora(r.worker.ultimo)}.`
            : "Ainda não implantado."}{" "}
          Envios automáticos e coleta de grupos estão parados; o modo assistido continua.
        </Banner>
      )}
      {comErro.length > 0 && (
        <Banner tipo="erro" titulo="Integração com erro">
          {comErro.map((i) => PLATAFORMA_ROTULO[i.plataforma]).join(", ")}:{" "}
          {veCredenciais ? "abra Integrações de afiliados e teste de novo." : "avise o dono."}
        </Banner>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        <Cartao titulo="Números de WhatsApp">
          <Linha
            itens={[
              {
                rotulo: "Conectados",
                valor: r.numeros.conectado,
                href: "/ofertas/numeros?status=conectado",
              },
              {
                rotulo: "Desconectados",
                valor: (r.numeros.desconectado ?? 0) + (r.numeros.aguardando_qr ?? 0),
                href: "/ofertas/numeros?status=desconectado",
              },
              { rotulo: "Com erro", valor: r.numeros.erro, href: "/ofertas/numeros?status=erro" },
            ]}
          />
        </Cartao>
        <Cartao titulo="Grupos">
          <Linha
            itens={[
              {
                rotulo: "Destino",
                valor: r.grupos.destino,
                href: "/ofertas/grupos?funcao=destino",
              },
              {
                rotulo: "Origem autorizada",
                valor: r.grupos.origem,
                href: "/ofertas/grupos?funcao=origem",
              },
              {
                rotulo: "Monitorados",
                valor: r.grupos.monitorado,
                href: "/ofertas/grupos?funcao=monitorado",
              },
              {
                rotulo: "Sem função",
                valor: r.grupos.nenhuma,
                href: "/ofertas/grupos?funcao=nenhuma",
              },
            ]}
          />
        </Cartao>
        <Cartao titulo="Envios dos últimos 7 dias">
          <Linha
            itens={[
              {
                rotulo: "Na fila agora",
                valor: r.envios7d.aguardando,
                href: "/ofertas/historico?periodo=30d&status=aguardando",
              },
              {
                rotulo: "Programados",
                valor: r.programados,
                href: "/ofertas/historico?periodo=30d&status=aguardando",
              },
              {
                rotulo: "Enviados",
                valor: r.envios7d.enviado,
                href: "/ofertas/historico?periodo=30d&status=enviado",
              },
              {
                rotulo: "Cancelados",
                valor: r.envios7d.cancelado,
                href: "/ofertas/historico?periodo=30d&status=cancelado",
              },
              {
                rotulo: "Com falha",
                valor: r.envios7d.falhou,
                href: "/ofertas/historico?periodo=30d&status=falhou",
              },
              {
                rotulo: "Incertos",
                valor: r.envios7d.incerto,
                href: "/ofertas/historico?periodo=30d&status=incerto",
              },
            ]}
          />
        </Cartao>
        <Cartao titulo="Automações do copiador">
          <Linha
            itens={[
              {
                rotulo: "Ativas",
                valor: r.automacoes.ativa,
                href: "/ofertas/copiador?status=ativa",
              },
              {
                rotulo: "Pausadas",
                valor: r.automacoes.pausada,
                href: "/ofertas/copiador?status=pausada",
              },
              {
                rotulo: "Em prévia",
                valor: r.automacoes.rascunho,
                href: "/ofertas/copiador?status=rascunho",
              },
              {
                rotulo: "Com erro",
                valor: r.automacoes.erro,
                href: "/ofertas/copiador?status=erro",
              },
            ]}
          />
        </Cartao>
        <Cartao titulo="Cupons">
          <Linha
            itens={[
              { rotulo: "Ativos", valor: r.cupons.ativos, href: "/ofertas/cupons" },
              {
                rotulo: "Vencem em 7 dias",
                valor: r.cupons.vencendo,
                href: "/ofertas/cupons?vence=7d",
              },
            ]}
          />
        </Cartao>
        <CartaoIndicador
          rotulo="Cliques reportados (30 dias)"
          valor={r.cliques30d ? n(r.cliques30d.total) : null}
          dica="Não disponível: importe o relatório de cliques das plataformas"
          rodape={
            r.cliques30d ? (
              <p className="mt-2 text-xs text-texto-3">
                Relatório importado em {formatarDataHora(r.cliques30d.importadoEm)}
              </p>
            ) : undefined
          }
          link={{ href: "/ofertas/relatorios?periodo=30d", rotulo: "Ver relatórios" }}
        />
        <CartaoIndicador
          rotulo="Comissão reportada (30 dias)"
          valor={r.comissao30d ? formatarMoeda(r.comissao30d.total) : null}
          dica="Não disponível: importe as conversões das plataformas"
          rodape={
            r.comissao30d ? (
              <p className="mt-2 text-xs text-texto-3">
                Importado em {formatarDataHora(r.comissao30d.importadoEm)}
              </p>
            ) : undefined
          }
          link={{ href: "/ofertas/relatorios?periodo=30d", rotulo: "Ver relatórios" }}
        />
        <CartaoIndicador
          rotulo="Alertas do módulo"
          valor={String(r.alertasAbertos)}
          link={{ href: "/alertas", rotulo: "Abrir alertas" }}
        />
      </div>
      <section className="rounded-2xl bg-card p-5 shadow-painel" aria-label="Integrações">
        <h2 className="mb-3 text-base font-semibold">Integrações de afiliados</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {r.integracoes.map((i) => (
            <li key={i.plataforma} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {PLATAFORMA_ROTULO[i.plataforma]}
                {!i.conformidade_em ? " (só rascunho)" : ""}
              </span>
              <Selo
                tom={
                  i.status === "conectada"
                    ? "sucesso"
                    : i.status === "indisponivel"
                      ? "info"
                      : i.status === "nao_configurada"
                        ? "neutro"
                        : "erro"
                }
              >
                {STATUS_INTEGRACAO_ROTULO[i.status]}
              </Selo>
            </li>
          ))}
        </ul>
        {veCredenciais && (
          <Link
            href="/ofertas/integracoes"
            className="mt-4 inline-block text-sm font-medium text-acao hover:underline"
          >
            Configurar integrações
          </Link>
        )}
      </section>
    </div>
  );
}
