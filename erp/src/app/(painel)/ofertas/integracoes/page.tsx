import { exigirLeitura } from "@/lib/auth/sessao";
import { listarIntegracoes, contarAnunciantesAwin } from "@/dados/ofertas/integracoes";
import {
  removerCredencial,
  retirarConformidade,
  testarIntegracao,
} from "@/acoes/ofertas/integracoes";
import { META_INTEGRACAO } from "@/dominio/ofertas/integracoes";
import {
  PLATAFORMA_ROTULO,
  STATUS_INTEGRACAO_ROTULO,
  type StatusIntegracao,
} from "@/dominio/ofertas/plataformas";
import { formatarDataHora } from "@/lib/formatos/data";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { Banner } from "@/componentes/painel/Banner";
import { Selo, type Tom } from "@/componentes/ofertas/Selo";
import {
  FormConformidade,
  FormIntegracao,
  TesteConversao,
} from "@/componentes/ofertas/Integracoes";

export const metadata = { title: "Integrações de afiliados" };

const TOM: Record<StatusIntegracao, Tom> = {
  conectada: "sucesso",
  indisponivel: "info",
  aguardando_autorizacao: "alerta",
  erro: "erro",
  credencial_expirada: "erro",
  nao_configurada: "neutro",
};

const DISPONIVEL: Record<string, { rotulo: string; tom: Tom }> = {
  sim: { rotulo: "Disponível", tom: "sucesso" },
  depende: { rotulo: "Com credencial", tom: "info" },
  manual: { rotulo: "Manual", tom: "neutro" },
  nao: { rotulo: "Não permitido", tom: "erro" },
};

const EXEMPLO: Record<string, string> = {
  shopee: "https://shopee.com.br/produto-i.123.456",
  mercado_livre: "https://produto.mercadolivre.com.br/MLB-123",
  amazon: "https://www.amazon.com.br/dp/B0ABCDEF12",
  awin: "https://www.loja-parceira.com.br/produto",
};

export default async function PaginaIntegracoesAfiliados() {
  await exigirLeitura("usuarios");
  const [integracoes, anunciantes] = await Promise.all([
    listarIntegracoes(),
    contarAnunciantesAwin(),
  ]);
  const chaveOk = !!process.env.OFERTAS_CHAVE_CRIPTO;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
          Integrações de afiliados
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-texto-2">
          Credenciais de cada programa. Identificadores públicos ficam à vista; segredos são
          cifrados no servidor e nunca voltam para a tela. O status Conectada só aparece depois de
          uma chamada real aceita pela plataforma.
        </p>
      </div>
      {!chaveOk && (
        <Banner tipo="erro" titulo="Chave de cifra ausente">
          Defina OFERTAS_CHAVE_CRIPTO no servidor antes de salvar segredos. Veja o guia em
          erp/docs/GUIA_CONFIGURACAO_INTEGRACOES.md.
        </Banner>
      )}
      {integracoes.map((i) => {
        const meta = META_INTEGRACAO[i.plataforma];
        const nome = PLATAFORMA_ROTULO[i.plataforma];
        const liberada = !!i.conformidade_em;
        return (
          <section
            key={i.plataforma}
            className="space-y-5 rounded-2xl bg-card p-5 shadow-painel"
            aria-label={nome}
          >
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{nome}</h2>
                  <Selo tom={TOM[i.status]}>{STATUS_INTEGRACAO_ROTULO[i.status]}</Selo>
                  <Selo tom={liberada ? "sucesso" : "alerta"}>
                    {liberada ? "Publicação em grupos liberada" : "Só rascunho"}
                  </Selo>
                </div>
                <p className="text-xs text-texto-3">
                  {i.testado_em
                    ? `Último teste ${formatarDataHora(i.testado_em)}`
                    : "Nunca testada"}
                  {i.segredo_configurado_em &&
                    ` · segredo salvo em ${formatarDataHora(i.segredo_configurado_em)}`}
                  {i.plataforma === "awin" &&
                    i.status === "conectada" &&
                    ` · ${anunciantes} anunciante(s) sincronizado(s)`}
                </p>
                {i.ultimo_erro && (
                  <p className="text-sm text-erro">
                    Último erro{i.ultimo_erro_em ? ` (${formatarDataHora(i.ultimo_erro_em)})` : ""}:{" "}
                    {i.ultimo_erro}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <BotaoAcao acao={testarIntegracao.bind(null, i.plataforma)} variant="secondary">
                  Testar conexão
                </BotaoAcao>
                {i.segredo_configurado_em && (
                  <BotaoAcao
                    acao={removerCredencial.bind(null, i.plataforma)}
                    variant="outline"
                    confirmar={{
                      titulo: `Remover a credencial da ${nome}?`,
                      descricao:
                        "O segredo é apagado e a conversão automática para. Ofertas já geradas não mudam.",
                      rotulo: "Remover",
                    }}
                  >
                    Remover credencial
                  </BotaoAcao>
                )}
              </div>
            </header>

            <FormIntegracao
              plataforma={i.plataforma}
              identificadores={i.identificadores}
              segredoConfigurado={i.segredo_configurado_em}
            />
            {meta.semApiDeLink && i.plataforma === "mercado_livre" && (
              <p className="text-sm text-texto-2">
                Sem API de links: gere o link no portal de afiliados (uma etiqueta por canal) e cole
                na oferta. O sistema marca como colado, não verificado.
              </p>
            )}
            <TesteConversao plataforma={i.plataforma} exemplo={EXEMPLO[i.plataforma]} />

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">O que a plataforma permite</h3>
                <ul className="space-y-2 text-sm">
                  {meta.metodos.map((m) => (
                    <li key={m.recurso} className="flex flex-wrap items-start gap-2">
                      <Selo tom={DISPONIVEL[m.disponivel].tom}>
                        {DISPONIVEL[m.disponivel].rotulo}
                      </Selo>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{m.recurso}</span>
                        <span className="block text-texto-2">{m.como}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Aprovações externas</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-texto-2">
                  {meta.aprovacoes.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
                <h3 className="pt-2 text-sm font-semibold">Documentação oficial</h3>
                <ul className="space-y-1 text-sm">
                  {meta.documentacao.map((d) => (
                    <li key={d.url}>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-acao underline-offset-4 hover:underline"
                      >
                        {d.rotulo}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-borda p-4">
              <h3 className="text-sm font-semibold">Canal WhatsApp no programa</h3>
              <p className="text-sm text-texto-2">{meta.conformidade}</p>
              {liberada ? (
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p className="text-texto-2">
                    Registrado em {formatarDataHora(i.conformidade_em)}
                    {i.conformidade_por_nome ? ` por ${i.conformidade_por_nome}` : ""}:{" "}
                    {i.conformidade_observacao}
                  </p>
                  <BotaoAcao
                    acao={retirarConformidade.bind(null, i.plataforma)}
                    variant="outline"
                    confirmar={{
                      titulo: `Bloquear a publicação de ${nome} em grupos?`,
                      descricao:
                        "Ofertas dessa plataforma passam a gerar só rascunho até um novo registro.",
                      rotulo: "Bloquear",
                    }}
                  >
                    Bloquear publicação
                  </BotaoAcao>
                </div>
              ) : (
                <FormConformidade plataforma={i.plataforma} />
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
