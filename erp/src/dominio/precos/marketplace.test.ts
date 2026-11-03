import { describe, expect, it } from "vitest";
import {
  calcularRoas,
  equilibrioComFaixas,
  faixaDoPreco,
  faixaManual,
  precoComFaixas,
  resolverFaixas,
  type EntradaMarketplace,
} from "./marketplace";
import { PLATAFORMA_POR_ID } from "./tabelas-marketplace";

const shopee = resolverFaixas(PLATAFORMA_POR_ID.shopee);
const tiktok = resolverFaixas(PLATAFORMA_POR_ID.tiktok);
const mlClassico = resolverFaixas(PLATAFORMA_POR_ID.ml_classico);
const e = (custo: number | string, imposto_pct = 0, extras_pedido = 0): EntradaMarketplace => ({
  custo,
  imposto_pct,
  extras_pedido,
});

describe("faixas resolvidas", () => {
  it("piso de cada faixa é o teto anterior mais um centavo", () => {
    expect(shopee.map((f) => f.de)).toEqual([0, 9, 80, 100, 200]);
    expect(mlClassico.map((f) => f.de)).toEqual([0, 12.5, 29, 50, 79]);
  });
  it("Mercado Livre usa a comissão da categoria e zera o fixo fora de Flex ou envio próprio", () => {
    expect(mlClassico.every((f) => f.comissao_pct === 0.14)).toBe(true);
    const coleta = resolverFaixas(PLATAFORMA_POR_ID.ml_premium, {
      comissao_categoria: 0.16,
      cobrar_fixo: false,
    });
    expect(coleta.every((f) => f.comissao_pct === 0.16 && f.fixo === 0)).toBe(true);
  });
  it("encontra a faixa de um preço", () => {
    expect(faixaDoPreco(shopee, 79.99).ate).toBe(79.99);
    expect(faixaDoPreco(shopee, 80).ate).toBe(99.99);
    expect(faixaDoPreco(shopee, 500).ate).toBeNull();
  });
});

describe("preço com faixas", () => {
  it("caso da planilha: custo 10,44106 na Shopee com imposto 4 % e margem 30 %", () => {
    const r = precoComFaixas(e("10.44106", 0.04), shopee, 0.3);
    expect(r.viavel).toBe(true);
    if (!r.viavel) return;
    expect(r.preco).toBe(32.49);
    expect(r.faixa.ate).toBe(79.99);
    expect(r.no_piso_da_faixa).toBe(false);
    expect(r.detalhe.comissao).toBe(6.498);
    expect(r.detalhe.fixo).toBe(4.5);
    expect(r.detalhe.imposto).toBe(1.2996);
    expect(r.detalhe.lucro).toBe(9.7513);
    expect(r.detalhe.margem).toBeGreaterThanOrEqual(0.3);
  });

  it("preço que passa do teto da faixa sobe para a faixa seguinte com as taxas dela", () => {
    const r = precoComFaixas(e(45, 0.04), shopee, 0.2);
    expect(r.viavel && r.faixa.ate).toBe(99.99);
    expect(r.preco).toBe(98.39);
  });

  it("vão entre faixas: o preço fica no piso da faixa mais barata (Mercado Livre em R$ 79)", () => {
    const r = precoComFaixas(e(40), mlClassico, 0.3);
    expect(r.viavel).toBe(true);
    if (!r.viavel) return;
    expect(r.preco).toBe(79);
    expect(r.no_piso_da_faixa).toBe(true);
    expect(r.detalhe.fixo).toBe(0);
    expect(r.detalhe.margem).toBeGreaterThan(0.3);
  });

  it("Mercado Livre com fixo pula de R$ 6,25 para R$ 6,50 quando o preço passa de R$ 28,99", () => {
    const r = precoComFaixas(e(10), mlClassico, 0.3);
    expect(r.viavel && r.faixa.fixo).toBe(6.5);
    expect(r.preco).toBe(29.47);
    const coleta = resolverFaixas(PLATAFORMA_POR_ID.ml_classico, { cobrar_fixo: false });
    expect(precoComFaixas(e(10), coleta, 0.3).preco).toBe(17.86);
  });

  it("Shopee abaixo de R$ 9 cobra metade do preço de fixo", () => {
    const r = precoComFaixas(e(2), shopee, 0);
    expect(r.viavel).toBe(true);
    if (!r.viavel) return;
    expect(r.preco).toBe(6.67);
    expect(r.detalhe.fixo).toBe(3.335);
    expect(r.detalhe.comissao).toBe(1.334);
  });

  it("margem que não cabe na faixa da metade do preço sobe para a faixa seguinte", () => {
    const r = precoComFaixas(e(2), shopee, 0.3);
    expect(r.viavel && r.faixa.de).toBe(9);
    expect(r.preco).toBe(13);
  });

  it("TikTok Shop vira de 10 % + R$ 4 para 6 % + R$ 6 em R$ 50", () => {
    const abaixo = precoComFaixas(e(25), tiktok, 0.3);
    expect(abaixo.preco).toBe(48.34);
    expect(abaixo.viavel && abaixo.faixa.comissao_pct).toBe(0.1);
    const acima = precoComFaixas(e(26), tiktok, 0.3);
    expect(acima.preco).toBe(50);
    expect(acima.viavel && acima.faixa.comissao_pct).toBe(0.06);
  });

  it("frete e outros por pedido entram no numerador", () => {
    const sem = precoComFaixas(e(10), faixaManual(0, 0), 0);
    const com = precoComFaixas(e(10, 0, 5), faixaManual(0, 0), 0);
    expect(sem.preco).toBe(10);
    expect(com.preco).toBe(15);
  });

  it("equilíbrio tem lucro zero", () => {
    const r = equilibrioComFaixas(e("10.44106", 0.04), shopee);
    expect(r.viavel && r.detalhe.lucro).toBeGreaterThanOrEqual(0);
    expect(r.viavel && r.detalhe.lucro).toBeLessThan(0.01);
  });

  it("margem que não fecha em nenhuma faixa devolve inviável, nunca um número", () => {
    const r = precoComFaixas(e(10, 0.04), shopee, 0.85);
    expect(r).toEqual({ viavel: false, preco: null });
  });
});

describe("ROAS", () => {
  it("mínimo empata o lucro, ideal mantém a margem pós-anúncio", () => {
    const r = calcularRoas(100, 25, 0.1);
    expect(r.minimo).toBe(4);
    expect(r.ideal).toBe(6.6667);
    expect(r.acos_maximo).toBe(0.25);
    expect(r.acos_ideal).toBe(0.15);
    expect(r.gasto_maximo).toBe(25);
    expect(r.gasto_ideal).toBe(15);
  });

  it("caso da planilha: ROAS mínimo 3,33 e ideal 5,00 com 10 % de margem pós-anúncio", () => {
    const p = precoComFaixas(e("10.44106", 0.04), shopee, 0.3);
    if (!p.viavel) throw new Error("inviavel");
    const r = calcularRoas(p.preco, p.detalhe.lucro, 0.1);
    expect(r.minimo).toBeCloseTo(3.33, 2);
    expect(r.ideal).toBeCloseTo(5, 2);
  });

  it("sem lucro antes do anúncio não há ROAS", () => {
    expect(calcularRoas(100, 0, 0.1).minimo).toBeNull();
    expect(calcularRoas(100, -5, 0).ideal).toBeNull();
  });

  it("margem pós-anúncio igual ou acima da margem: só o mínimo existe", () => {
    const r = calcularRoas(100, 25, 0.25);
    expect(r.minimo).toBe(4);
    expect(r.ideal).toBeNull();
    expect(r.gasto_ideal).toBeNull();
  });
});
