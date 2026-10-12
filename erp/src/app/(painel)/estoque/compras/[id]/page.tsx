import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { obterCompra, totalDasLinhas } from "@/dados/estoque/compras";
import { listarUnidades } from "@/dados/estoque/insumos";
import { cancelarCompra, confirmarCompra } from "@/acoes/estoque/compras";
import { formatarMoeda } from "@/lib/formatos/moeda";
import { formatarData, formatarDataHora } from "@/lib/formatos/data";
import { ItensCompra } from "@/componentes/estoque/ItensCompra";
import { STATUS_COMPRA } from "@/dominio/estoque/conversao";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { Banner } from "@/componentes/painel/Banner";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";

export default async function PaginaCompra({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirLeitura("estoque");
  const { id } = await params;
  const [compra, unidades] = await Promise.all([obterCompra(id), listarUnidades()]);
  if (!compra) notFound();
  const editar = podeEscrever(usuario.papel, "estoque");
  const s = STATUS_COMPRA[compra.status] ?? { rotulo: compra.status, variante: "outline" as const };
  const linhas = totalDasLinhas(compra.itens);
  const total =
    linhas -
    Number(compra.desconto_total) +
    (compra.preco_inclui_frete ? 0 : Number(compra.frete)) +
    Number(compra.outros_custos);
  const rascunho = compra.status === "rascunho";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight">
              Compra{" "}
              {compra.numero_documento
                ? compra.numero_documento
                : `de ${formatarData(compra.data)}`}
            </h1>
            <Badge variant={s.variante}>{s.rotulo}</Badge>
          </div>
          <p className="mt-1 text-sm text-texto-2">
            {formatarData(compra.data)} · {compra.fornecedor?.nome ?? "Sem fornecedor"}
            {compra.confirmada_em && (
              <span> · confirmada em {formatarDataHora(compra.confirmada_em)}</span>
            )}
          </p>
        </div>
        {editar && rascunho && (
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/estoque/compras/${compra.id}/editar`}>Editar</Link>
            </Button>
            <BotaoAcao
              variant="outline"
              acao={cancelarCompra.bind(null, compra.id)}
              confirmar={{
                titulo: "Cancelar esta compra?",
                descricao: "O rascunho fica guardado como cancelado e nada entra no estoque.",
                rotulo: "Cancelar compra",
              }}
            >
              Cancelar
            </BotaoAcao>
            <BotaoAcao
              variant="secondary"
              acao={confirmarCompra.bind(null, compra.id)}
              confirmar={{
                titulo: "Confirmar a compra e dar entrada no estoque?",
                descricao: `Frete, desconto e encargos são rateados por linha. Entram ${formatarMoeda(total)} em lotes; cada rolo de filamento vira um lote. Depois disso a compra não muda; correções são por estorno.`,
                rotulo: "Confirmar compra",
              }}
            >
              Confirmar compra
            </BotaoAcao>
          </div>
        )}
      </div>
      {rascunho && (
        <Banner tipo="info" titulo="Rascunho">
          Os valores abaixo são prévia. O estoque só muda ao confirmar.
        </Banner>
      )}
      <div className="numeros grid gap-3 rounded-2xl bg-card p-5 shadow-painel sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="text-[13px] text-texto-2">Linhas</p>
          <p className="text-lg font-semibold">{formatarMoeda(linhas)}</p>
        </div>
        <div>
          <p className="text-[13px] text-texto-2">Desconto do pedido</p>
          <p className="text-lg font-semibold">{formatarMoeda(compra.desconto_total)}</p>
        </div>
        <div>
          <p className="text-[13px] text-texto-2">
            Frete{compra.preco_inclui_frete ? " (já nos preços)" : ""}
          </p>
          <p className="text-lg font-semibold">{formatarMoeda(compra.frete)}</p>
        </div>
        <div>
          <p className="text-[13px] text-texto-2">Outros encargos</p>
          <p className="text-lg font-semibold">{formatarMoeda(compra.outros_custos)}</p>
        </div>
        <div>
          <p className="text-[13px] text-texto-2">Custo de aquisição</p>
          <p className="text-lg font-semibold text-acao">{formatarMoeda(total)}</p>
          <p className="text-xs text-texto-3">
            rateio por {compra.metodo_rateio === "quantidade" ? "quantidade" : "valor"}
          </p>
        </div>
      </div>
      <ItensCompra compra={compra} unidades={unidades} />
      {compra.observacoes && (
        <p className="text-sm whitespace-pre-line text-texto-2">{compra.observacoes}</p>
      )}
    </div>
  );
}
