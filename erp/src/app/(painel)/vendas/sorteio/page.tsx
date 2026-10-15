import { exigirLeitura } from "@/lib/auth/sessao";
import { listarInscricoes, listarMesesSorteio, obterSorteio } from "@/dados/vendas/sorteio";
import { referenciaAtual, referenciaValida, rotuloReferencia } from "@/dominio/sorteio/referencia";
import { realizarSorteio } from "@/acoes/vendas/sorteio";
import { CartaoGanhador, FiltroMes, TabelaInscricoes } from "@/componentes/vendas/Sorteio";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Sorteio" };

export default async function PaginaSorteio({
  searchParams,
}: {
  searchParams: Promise<{ referencia?: string }>;
}) {
  const usuario = await exigirLeitura("vendas");
  const { referencia: pedida } = await searchParams;
  const referencia = referenciaValida(pedida) ? pedida : referenciaAtual();
  const [meses, inscricoes, sorteio] = await Promise.all([
    listarMesesSorteio(),
    listarInscricoes(referencia),
    obterSorteio(referencia),
  ]);
  const opcoes = meses.some((m) => m.referencia === referencia)
    ? meses
    : [{ referencia, total: 0 }, ...meses];
  const elegiveis = inscricoes.filter((i) => i.aceita_contato && !i.cliente?.anonimizado).length;
  const dono = usuario.papel === "dono";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Sorteio</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">
            Cadastros feitos pela página pública do panfleto (QR). Um ganhador por mês, entre quem
            aceitou contato.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FiltroMes referencia={referencia} opcoes={opcoes} />
          <Button asChild variant="outline" size="sm">
            <a href={`/vendas/sorteio/exportar?referencia=${referencia}`}>CSV</a>
          </Button>
          {dono && !sorteio && (
            <BotaoAcao
              acao={realizarSorteio.bind(null, referencia)}
              variant="secondary"
              confirmar={{
                titulo: `Sortear o ganhador de ${rotuloReferencia(referencia)}?`,
                descricao: `${elegiveis} inscrição(ões) elegível(is). O resultado fica gravado e não dá para sortear o mesmo mês de novo.`,
                rotulo: "Sortear",
              }}
            >
              Sortear ganhador do mês
            </BotaoAcao>
          )}
        </div>
      </div>

      {sorteio && <CartaoGanhador sorteio={sorteio} />}

      <p className="text-sm text-texto-2">
        {inscricoes.length} inscrição(ões) em {rotuloReferencia(referencia)}, {elegiveis}{" "}
        elegível(is).
      </p>

      {inscricoes.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma inscrição neste mês"
          descricao="As inscrições chegam pela página pública /sorteio, apontada pelo QR do panfleto."
        />
      ) : (
        <TabelaInscricoes inscricoes={inscricoes} />
      )}
    </div>
  );
}
