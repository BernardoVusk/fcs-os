import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import {
  contagemPorStatus,
  destinosDaAutomacao,
  mensagensDaAutomacao,
  obterAutomacao,
} from "@/dados/ofertas/copiador";
import { gruposDestino, listarGrupos } from "@/dados/ofertas/cadastros";
import { listarNumeros } from "@/dados/ofertas/whatsapp";
import { mudarStatusAutomacao, salvarDestinosAutomacao } from "@/acoes/ofertas/copiador";
import { MOTIVO_COPIADOR_ROTULO, STATUS_AUTOMACAO } from "@/dominio/ofertas/copiador";
import { PLATAFORMA_ROTULO, lerPlataforma } from "@/dominio/ofertas/plataformas";
import { formatarDataHora } from "@/lib/formatos/data";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Banner } from "@/componentes/painel/Banner";
import { Selo, type Tom } from "@/componentes/ofertas/Selo";
import {
  FormAutomacao,
  RevisarMensagem,
  SeletorDestinos,
  TestarRegras,
} from "@/componentes/ofertas/Copiador";

export const metadata = { title: "Automação do copiador" };

const STATUS_MSG: Record<string, { rotulo: string; tom: Tom }> = {
  previa: { rotulo: "Prévia", tom: "info" },
  recebida: { rotulo: "Recebida", tom: "info" },
  ignorada: { rotulo: "Ignorada", tom: "neutro" },
  aguardando_revisao: { rotulo: "Em revisão", tom: "alerta" },
  publicada: { rotulo: "Publicada", tom: "sucesso" },
  descartada: { rotulo: "Descartada", tom: "neutro" },
  falhou: { rotulo: "Falhou", tom: "erro" },
};

export default async function PaginaAutomacao({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirLeitura("ofertas");
  const { id } = await params;
  const a = await obterAutomacao(id);
  if (!a) notFound();
  const escreve = podeEscrever(usuario.papel, "ofertas");
  const [destinos, grupos, origens, numeros, revisao, recentes, contagem] = await Promise.all([
    destinosDaAutomacao(id),
    gruposDestino(),
    listarGrupos({ funcao: "origem" }),
    listarNumeros(),
    escreve ? mensagensDaAutomacao(id, ["aguardando_revisao"], 30) : Promise.resolve([]),
    escreve ? mensagensDaAutomacao(id, undefined, 30) : Promise.resolve([]),
    contagemPorStatus(id),
  ]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{a.nome}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-texto-2">
            <Selo
              tom={a.status === "ativa" ? "sucesso" : a.status === "pausada" ? "alerta" : "neutro"}
            >
              {STATUS_AUTOMACAO[a.status]}
            </Selo>
            Origem {a.origem?.nome ?? "removida"} ·{" "}
            {a.numero ? `envia por ${a.numero.rotulo}` : "manual"} · plataformas{" "}
            {a.plataformas.map((p) => PLATAFORMA_ROTULO[lerPlataforma(p)!] ?? p).join(", ")}
          </p>
        </div>
        {escreve && (
          <div className="flex flex-wrap gap-2">
            {a.status !== "ativa" && a.status !== "encerrada" && (
              <BotaoAcao
                acao={mudarStatusAutomacao.bind(null, id, "ativar")}
                variant="secondary"
                confirmar={{
                  titulo: "Ativar esta automação?",
                  descricao: `Mensagens novas da origem passam pelas regras e ${a.revisao_manual ? "vão para revisão" : "são publicadas direto"} em ${destinos.length} grupo(s).`,
                  rotulo: "Ativar",
                }}
              >
                Ativar
              </BotaoAcao>
            )}
            {a.status === "ativa" && (
              <BotaoAcao acao={mudarStatusAutomacao.bind(null, id, "pausar")} variant="outline">
                Pausar
              </BotaoAcao>
            )}
            {a.status !== "rascunho" && a.status !== "encerrada" && (
              <BotaoAcao acao={mudarStatusAutomacao.bind(null, id, "rascunho")} variant="ghost">
                Voltar para prévia
              </BotaoAcao>
            )}
            {a.status !== "encerrada" && (
              <BotaoAcao
                acao={mudarStatusAutomacao.bind(null, id, "encerrar")}
                variant="ghost"
                confirmar={{
                  titulo: "Encerrar esta automação?",
                  descricao: "Ela para de ler a origem. O histórico fica.",
                }}
              >
                Encerrar
              </BotaoAcao>
            )}
          </div>
        )}
      </div>
      <p className="text-sm text-texto-2">
        Últimos 7 dias:{" "}
        {Object.entries(contagem).length
          ? Object.entries(contagem)
              .map(([s, n]) => `${n} ${STATUS_MSG[s]?.rotulo.toLowerCase() ?? s}`)
              .join(", ")
          : "nenhuma mensagem recebida"}
        .
      </p>
      {a.status === "rascunho" && (
        <Banner tipo="info" titulo="Em prévia">
          O worker registra as mensagens da origem e mostra o que faria, mas nada é publicado até
          você ativar.
        </Banner>
      )}

      {escreve && revisao.length > 0 && (
        <section className="space-y-3" aria-label="Revisão">
          <h2 className="text-base font-semibold">Para revisar ({revisao.length})</h2>
          {revisao.map((m) => (
            <article key={m.id} className="space-y-2 rounded-2xl bg-card p-4 shadow-painel">
              <p className="text-xs text-texto-3">
                {formatarDataHora(m.recebida_em)} ·{" "}
                {m.motivo ? (MOTIVO_COPIADOR_ROTULO[m.motivo] ?? m.motivo) : ""}
              </p>
              <RevisarMensagem
                id={m.id}
                original={m.texto}
                processado={m.texto_processado ?? ""}
                plataforma={m.plataforma ?? ""}
              />
            </article>
          ))}
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl bg-card p-5 shadow-painel" aria-label="Destinos">
          <h2 className="text-base font-semibold">Grupos de destino</h2>
          {escreve ? (
            <SeletorDestinos
              grupos={grupos.map((g) => ({ id: g.id, nome: g.nome, funcao: g.funcao }))}
              marcados={destinos}
              salvar={salvarDestinosAutomacao.bind(null, id)}
            />
          ) : (
            <p className="text-sm text-texto-2">{destinos.length} grupo(s).</p>
          )}
        </section>
        {escreve && (
          <section className="space-y-3 rounded-2xl bg-card p-5 shadow-painel" aria-label="Regras">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Regras</h2>
              <DialogoNovo rotulo="Editar regras" titulo={`Regras de ${a.nome}`}>
                <FormAutomacao
                  id={id}
                  a={a}
                  origens={origens.map((o) => ({ id: o.id, nome: o.nome }))}
                  numeros={numeros.map((n) => ({ id: n.id, rotulo: n.rotulo }))}
                />
              </DialogoNovo>
            </div>
            <TestarRegras id={id} />
          </section>
        )}
      </div>

      {escreve && (
        <section className="space-y-3" aria-label="Mensagens recentes">
          <h2 className="text-base font-semibold">Mensagens recentes da origem</h2>
          {recentes.length === 0 ? (
            <EstadoVazio
              titulo="Nenhuma mensagem ainda"
              descricao="Chegam quando o número coletor do grupo de origem estiver conectado."
            />
          ) : (
            <ul className="divide-y divide-borda overflow-hidden rounded-2xl bg-card text-sm shadow-painel">
              {recentes.map((m) => (
                <li key={m.id} className="space-y-1 px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Selo tom={STATUS_MSG[m.status]?.tom ?? "neutro"}>
                      {STATUS_MSG[m.status]?.rotulo ?? m.status}
                    </Selo>
                    <span className="text-xs text-texto-3">
                      {formatarDataHora(m.recebida_em)}
                      {m.motivo ? ` · ${MOTIVO_COPIADOR_ROTULO[m.motivo] ?? m.motivo}` : ""}
                      {m.plataforma
                        ? ` · ${PLATAFORMA_ROTULO[lerPlataforma(m.plataforma)!] ?? m.plataforma}`
                        : ""}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-xs whitespace-pre-wrap text-texto-2">
                    {m.texto_processado ?? m.texto ?? "(texto apagado pela retenção de 30 dias)"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-texto-3">
            O texto de terceiro fica guardado por 30 dias e só aparece para quem escreve no módulo.
            Depois disso ficam só a decisão, o link e o hash.
          </p>
        </section>
      )}
      <Link href="/ofertas/copiador" className="text-sm text-acao hover:underline">
        Voltar para o copiador
      </Link>
    </div>
  );
}
