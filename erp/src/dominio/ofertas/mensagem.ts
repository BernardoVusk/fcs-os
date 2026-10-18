import { formatarData, formatarDataHora } from "@/lib/formatos/data";
import { formatarNumero } from "@/lib/formatos/numero";
import { PLATAFORMA_ROTULO, type Plataforma } from "./plataformas";
import type { ValoresModelo } from "./modelos";

/** Campos da oferta e do cupom que entram na mensagem (como vêm do banco). */
export type OfertaMensagem = {
  plataforma: Plataforma;
  titulo: string | null;
  preco_atual: number | string | null;
  preco_anterior: number | string | null;
  desconto: number | string | null;
  preco_pix: number | string | null;
  parcelamento: string | null;
  avaliacao: number | string | null;
  avaliacoes_qtd: number | null;
  loja: string | null;
  preco_variavel: boolean;
  cta: string | null;
  dados_atualizados_em: string | null;
};

export type CupomMensagem = {
  plataforma: Plataforma;
  codigo: string | null;
  descricao: string;
  beneficio: string | null;
  regras: string | null;
  valor_minimo: number | string | null;
  fim_em: string | null;
  validade_confirmada: boolean;
};

const reais = (v: number | string | null) => {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `R$ ${formatarNumero(n, 2)}` : null;
};

function textoCupom(c: CupomMensagem) {
  const regras = [
    c.regras?.trim(),
    reais(c.valor_minimo) ? `Compra mínima de ${reais(c.valor_minimo)}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    cupom: c.codigo,
    cupom_beneficio: c.beneficio ?? c.descricao,
    cupom_regras: regras || null,
    validade_cupom: c.fim_em ? formatarData(c.fim_em) : null,
  };
}

/** Valores formatados para o modelo. Campo sem dado fica nulo (a seção do modelo some). */
export function valoresDaOferta(
  o: OfertaMensagem,
  link: string | null,
  cupom?: CupomMensagem | null,
): ValoresModelo {
  const preco = reais(o.preco_atual);
  const desconto = o.desconto !== null && o.desconto !== "" ? Number(o.desconto) : null;
  const nota = o.avaliacao !== null && o.avaliacao !== "" ? Number(o.avaliacao) : null;
  const valores: ValoresModelo = {
    produto: o.titulo?.trim() || null,
    preco_atual: preco ? (o.preco_variavel ? `a partir de ${preco}` : preco) : null,
    preco_anterior: reais(o.preco_anterior),
    desconto: desconto && desconto > 0 && desconto < 1 ? `${Math.round(desconto * 100)}%` : null,
    preco_pix: reais(o.preco_pix) ? `${reais(o.preco_pix)} no Pix` : null,
    parcelamento: o.parcelamento?.trim() || null,
    avaliacao:
      nota && nota > 0
        ? `Nota ${formatarNumero(nota, 1)}${o.avaliacoes_qtd ? ` (${formatarNumero(o.avaliacoes_qtd, 0)} avaliações)` : ""}`
        : null,
    loja: o.loja?.trim() || null,
    link,
    marketplace:
      o.plataforma === "awin" ? o.loja?.trim() || "Loja parceira" : PLATAFORMA_ROTULO[o.plataforma],
    cta: o.cta?.trim() || null,
    atualizado_em: o.dados_atualizados_em ? formatarDataHora(o.dados_atualizados_em) : null,
  };
  if (cupom && cupom.plataforma === o.plataforma) Object.assign(valores, textoCupom(cupom));
  return valores;
}

export function valoresDoCupom(c: CupomMensagem, link: string | null): ValoresModelo {
  return { ...textoCupom(c), link, marketplace: PLATAFORMA_ROTULO[c.plataforma] };
}
