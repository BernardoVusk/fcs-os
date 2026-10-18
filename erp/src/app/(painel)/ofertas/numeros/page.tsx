import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { eventosDosNumeros, listarNumeros, workerOnline } from "@/dados/ofertas/whatsapp";
import { listarGrupos } from "@/dados/ofertas/cadastros";
import { comandoNumero, renovarAceite } from "@/acoes/ofertas/whatsapp";
import {
  EVENTO_NUMERO_ROTULO,
  STATUS_NUMERO_ROTULO,
  telefoneExibido,
  VERSAO_ACEITE,
} from "@/dominio/ofertas/risco";
import { formatarDataHora } from "@/lib/formatos/data";
import { Banner } from "@/componentes/painel/Banner";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Selo, type Tom } from "@/componentes/ofertas/Selo";
import { Conectar, EnviarTeste, FormLimites, FormNovoNumero } from "@/componentes/ofertas/Numeros";

export const metadata = { title: "Números de WhatsApp" };

const TOM: Record<string, Tom> = {
  conectado: "sucesso",
  aguardando_qr: "info",
  conectando: "info",
  desconectado: "neutro",
  erro: "erro",
  removido: "neutro",
};

export default async function PaginaNumeros({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const usuario = await exigirLeitura("ofertas");
  const { status } = await searchParams;
  const [todos, worker, testes] = await Promise.all([
    listarNumeros(),
    workerOnline(),
    listarGrupos({ funcao: "teste", ativos: true }),
  ]);
  const numeros = status
    ? todos.filter((n) => (n.estado?.status ?? "desconectado") === status)
    : todos;
  const eventos = await eventosDosNumeros(
    numeros.map((n) => n.id),
    6,
  );
  const dono = usuario.papel === "dono";
  const escreve = podeEscrever(usuario.papel, "ofertas");
  const gruposTeste = testes.filter((g) => g.jid).map((g) => ({ id: g.id, nome: g.nome }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
            Números de WhatsApp
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-texto-2">
            Números dedicados que o worker usa para ler grupos e enviar ofertas no modo automático.
            Cada número tem limites próprios e é escolhido explicitamente em cada fila ou automação;
            não há rotação de números.
          </p>
        </div>
        {dono && (
          <DialogoNovo rotulo="Adicionar número" titulo="Novo número de WhatsApp">
            <FormNovoNumero />
          </DialogoNovo>
        )}
      </div>
      <Banner
        tipo={worker.online ? "sucesso" : "alerta"}
        titulo={worker.online ? "Worker no ar" : "Worker sem sinal"}
      >
        {worker.online
          ? `Último sinal ${formatarDataHora(worker.ultimo)}.`
          : worker.ultimo
            ? `Último sinal ${formatarDataHora(worker.ultimo)}. Conexões, coleta e envios automáticos estão parados; o modo assistido continua.`
            : "O worker ainda não foi implantado (Fly.io). Sem ele não há conexão: veja o guia de configuração. O modo assistido funciona sem ele."}
      </Banner>
      {numeros.length === 0 ? (
        <EstadoVazio
          titulo={status ? "Nenhum número nesse estado" : "Nenhum número cadastrado"}
          descricao="Cadastre um número dedicado e conecte pelo QR Code. Sem número, use o modo assistido em Publicar."
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {numeros.map((n) => {
            const st = n.estado?.status ?? "desconectado";
            const meus = eventos.filter((e) => e.numero_id === n.id).slice(0, 6);
            const aceiteVelho = n.aceite_risco_versao !== VERSAO_ACEITE;
            return (
              <li key={n.id} className="space-y-4 rounded-2xl bg-card p-5 shadow-painel">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{n.rotulo}</h2>
                    <p className="text-xs text-texto-3">
                      {telefoneExibido(n.telefone)}
                      {n.estado?.nome_exibido ? ` · ${n.estado.nome_exibido}` : ""}
                    </p>
                  </div>
                  <Selo tom={TOM[st] ?? "neutro"}>{STATUS_NUMERO_ROTULO[st] ?? st}</Selo>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <dt className="text-texto-3">Última atividade</dt>
                  <dd>
                    {n.estado?.ultima_atividade_em
                      ? formatarDataHora(n.estado.ultima_atividade_em)
                      : "Sem dados"}
                  </dd>
                  <dt className="text-texto-3">Última sincronização</dt>
                  <dd>
                    {n.estado?.ultima_sincronizacao_em
                      ? formatarDataHora(n.estado.ultima_sincronizacao_em)
                      : "Sem dados"}
                  </dd>
                  <dt className="text-texto-3">Limites</dt>
                  <dd>
                    {n.limite_por_hora}/hora, {n.limite_por_dia}/dia, {n.intervalo_min_segundos} s
                    entre envios, das {n.janela_inicio.slice(0, 5)} às {n.janela_fim.slice(0, 5)}
                  </dd>
                  <dt className="text-texto-3">Aceite de risco</dt>
                  <dd>
                    {n.aceite_risco_em
                      ? `${formatarDataHora(n.aceite_risco_em)} (versão ${n.aceite_risco_versao})`
                      : "Pendente"}
                  </dd>
                </dl>
                {n.estado?.ultimo_erro && st !== "conectado" && (
                  <p className="text-sm text-erro">{n.estado.ultimo_erro}</p>
                )}
                {dono && aceiteVelho && (
                  <Banner
                    tipo="alerta"
                    acao={
                      <BotaoAcao acao={renovarAceite.bind(null, n.id)} variant="outline">
                        Renovar aceite
                      </BotaoAcao>
                    }
                  >
                    O texto do risco mudou desde o aceite deste número.
                  </Banner>
                )}
                {dono && st !== "conectado" && (
                  <Conectar id={n.id} temTelefone={!!n.telefone} statusInicial={st} />
                )}
                <div className="flex flex-wrap gap-2">
                  {escreve && st === "conectado" && (
                    <BotaoAcao
                      acao={comandoNumero.bind(null, n.id, "sincronizar_grupos", undefined)}
                      variant="secondary"
                    >
                      Sincronizar grupos
                    </BotaoAcao>
                  )}
                  {dono && (
                    <DialogoNovo rotulo="Limites" titulo={`Limites de ${n.rotulo}`}>
                      <FormLimites id={n.id} n={n} />
                    </DialogoNovo>
                  )}
                  {dono && st === "conectado" && (
                    <BotaoAcao
                      acao={comandoNumero.bind(null, n.id, "desconectar", undefined)}
                      variant="outline"
                      confirmar={{
                        titulo: `Desconectar ${n.rotulo}?`,
                        descricao:
                          "A sessão é encerrada no celular. Envios automáticos deste número ficam esperando.",
                      }}
                    >
                      Desconectar
                    </BotaoAcao>
                  )}
                  {dono && (
                    <BotaoAcao
                      acao={comandoNumero.bind(null, n.id, "remover", undefined)}
                      variant="ghost"
                      confirmar={{
                        titulo: `Remover ${n.rotulo}?`,
                        descricao: "A sessão é encerrada e apagada. Grupos e histórico ficam.",
                        rotulo: "Remover",
                      }}
                    >
                      Remover
                    </BotaoAcao>
                  )}
                </div>
                {escreve && st === "conectado" && <EnviarTeste id={n.id} grupos={gruposTeste} />}
                {meus.length > 0 && (
                  <div>
                    <h3 className="mb-1 text-xs font-medium text-texto-3">Eventos recentes</h3>
                    <ul className="space-y-0.5 text-xs">
                      {meus.map((e, i) => (
                        <li key={i}>
                          <span className="numeros text-texto-3">
                            {formatarDataHora(e.ocorrido_em)}
                          </span>{" "}
                          {EVENTO_NUMERO_ROTULO[e.tipo] ?? e.tipo}
                          {e.detalhe ? `: ${e.detalhe}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
