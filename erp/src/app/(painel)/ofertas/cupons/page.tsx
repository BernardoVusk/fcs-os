import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { gruposDestino, listarCupons, plataformasLiberadas } from "@/dados/ofertas/cadastros";
import { mudarStatusCupom } from "@/acoes/ofertas/cadastros";
import { PLATAFORMA_ROTULO } from "@/dominio/ofertas/plataformas";
import {
  cupomPodeSair,
  situacaoCupom,
  SITUACAO_CUPOM_ROTULO,
  TOM_SITUACAO_CUPOM,
  venceEmBreve,
} from "@/dominio/ofertas/cupons";
import { formatarData, formatarDataHora, isoParaLocal } from "@/lib/formatos/data";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Banner } from "@/componentes/painel/Banner";
import { Selo } from "@/componentes/ofertas/Selo";
import { FormCupom } from "@/componentes/ofertas/FormsCadastro";
import { PublicarCupom } from "@/componentes/ofertas/PublicarCupom";

export const metadata = { title: "Cupons" };

export default async function PaginaCupons({
  searchParams,
}: {
  searchParams: Promise<{ vence?: string }>;
}) {
  const usuario = await exigirLeitura("ofertas");
  const { vence } = await searchParams;
  const [todos, grupos, liberadas] = await Promise.all([
    listarCupons(),
    gruposDestino(),
    plataformasLiberadas(),
  ]);
  const cupons = vence === "7d" ? todos.filter((c) => venceEmBreve(c, 7)) : todos;
  const escreve = podeEscrever(usuario.papel, "ofertas");
  const opcoesGrupos = grupos.map((g) => ({ id: g.id, nome: g.nome, funcao: g.funcao }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Cupons</h1>
          <p className="mt-1 max-w-3xl text-sm text-texto-2">
            Shopee, Mercado Livre e Amazon não oferecem API de cupons para afiliados: o cadastro é
            manual e fica marcado assim. Cupons da Awin entram pela API de promoções. Cupom vencido,
            pausado ou futuro não sai em nenhuma mensagem.
          </p>
        </div>
        {escreve && (
          <DialogoNovo rotulo="Cadastrar cupom" titulo="Novo cupom">
            <FormCupom />
          </DialogoNovo>
        )}
      </div>
      {vence === "7d" && (
        <Banner tipo="info">Mostrando só cupons que vencem nos próximos 7 dias.</Banner>
      )}
      {cupons.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum cupom"
          descricao="Cadastre um cupom para vincular a ofertas ou publicar sozinho."
        />
      ) : (
        <ul className="divide-y divide-borda overflow-hidden rounded-2xl bg-card shadow-painel">
          {cupons.map((c) => {
            const s = situacaoCupom(c);
            const liberada = liberadas.includes(c.plataforma);
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1 basis-72">
                  <p className="font-medium">
                    {c.codigo ? <span className="font-mono">{c.codigo}</span> : "Sem código"} ·{" "}
                    {PLATAFORMA_ROTULO[c.plataforma]}
                  </p>
                  <p className="text-texto-2">{c.beneficio ?? c.descricao}</p>
                  <p className="text-xs text-texto-3">
                    {c.fim_em ? `Até ${formatarData(c.fim_em)}` : "Validade não informada"}
                    {c.valor_minimo ? ` · mínimo ${formatarMoeda(c.valor_minimo)}` : ""} · fonte{" "}
                    {c.fonte === "awin"
                      ? "API da Awin"
                      : c.fonte === "csv"
                        ? "importação"
                        : "manual"}
                    {c.verificado_em ? ` · conferido ${formatarDataHora(c.verificado_em)}` : ""}
                  </p>
                </div>
                <Selo tom={TOM_SITUACAO_CUPOM[s]}>{SITUACAO_CUPOM_ROTULO[s]}</Selo>
                {escreve && (
                  <>
                    {cupomPodeSair(c) && (
                      <PublicarCupom
                        cupomId={c.id}
                        grupos={opcoesGrupos}
                        desabilitado={!liberada}
                        motivo="Plataforma sem canal liberado"
                      />
                    )}
                    {c.fonte === "manual" && (
                      <DialogoNovo rotulo="Editar" titulo="Editar cupom">
                        <FormCupom
                          cupom={{
                            ...c,
                            inicio_local: isoParaLocal(c.inicio_em),
                            fim_local: isoParaLocal(c.fim_em),
                          }}
                        />
                      </DialogoNovo>
                    )}
                    {c.status === "ativo" ? (
                      <BotaoAcao
                        acao={mudarStatusCupom.bind(null, c.id, "pausado")}
                        variant="outline"
                      >
                        Pausar
                      </BotaoAcao>
                    ) : (
                      c.status === "pausado" && (
                        <BotaoAcao
                          acao={mudarStatusCupom.bind(null, c.id, "ativo")}
                          variant="outline"
                        >
                          Reativar
                        </BotaoAcao>
                      )
                    )}
                    {c.status !== "expirado" && (
                      <BotaoAcao
                        acao={mudarStatusCupom.bind(null, c.id, "expirado")}
                        variant="ghost"
                      >
                        Marcar expirado
                      </BotaoAcao>
                    )}
                    <BotaoAcao
                      acao={mudarStatusCupom.bind(null, c.id, "removido")}
                      variant="ghost"
                      confirmar={{
                        titulo: "Remover este cupom?",
                        descricao: "Ele sai da lista e não entra em novas mensagens.",
                      }}
                    >
                      Remover
                    </BotaoAcao>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
