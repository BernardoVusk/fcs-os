import type { MetricasGrupo } from "@/dominio/ofertas/evasao";
import { formatarNumero } from "@/lib/formatos/numero";
import { CartaoIndicador } from "@/componentes/painel/CartaoIndicador";

const sinal = (n: number) => (n > 0 ? `+${formatarNumero(n, 0)}` : formatarNumero(n, 0));

/** Cartões de métricas do grupo. Visualizações: sempre indisponível (nenhuma integração mede). */
export function CartoesMetricas({ m, enviados }: { m: MetricasGrupo; enviados: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
      <CartaoIndicador
        rotulo="Membros no início"
        valor={m.membrosInicio === null ? null : formatarNumero(m.membrosInicio, 0)}
        dica="Sem medição antes do início do período"
      />
      <CartaoIndicador
        rotulo="Membros no fim"
        valor={m.membrosFim === null ? null : formatarNumero(m.membrosFim, 0)}
        dica="Sem medição no período"
      />
      <CartaoIndicador rotulo="Entradas observadas" valor={formatarNumero(m.entradas, 0)} />
      <CartaoIndicador rotulo="Saídas observadas" valor={formatarNumero(m.saidas, 0)} />
      <CartaoIndicador rotulo="Saldo (entradas menos saídas)" valor={sinal(m.saldo)} />
      <CartaoIndicador
        rotulo="Variação líquida de membros"
        valor={m.variacaoLiquida === null ? null : sinal(m.variacaoLiquida)}
        dica="Precisa de medição no início e no fim"
      />
      <CartaoIndicador
        rotulo="Taxa de evasão"
        valor={m.evasao === null ? null : `${formatarNumero(m.evasao, 2)} %`}
        dica={
          m.evasaoSituacao === "inicio_zero"
            ? "Não calculável: o grupo começou o período sem membros"
            : "Sem medição de membros no início do período"
        }
      />
      <CartaoIndicador
        rotulo="Mensagens publicadas pelo sistema"
        valor={formatarNumero(enviados, 0)}
      />
      <CartaoIndicador rotulo="Visualizações" valor={null} dica="Não disponível pela integração" />
    </div>
  );
}
