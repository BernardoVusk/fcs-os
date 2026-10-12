import { describe, expect, it } from "vitest";
import { camposSobrescritos, fichaEfetiva, type FichaProduto } from "./heranca";
import { resumirBom } from "./bom";
import { montarEntradasProduto } from "./calculo-produto";
import { calcular } from "@/dominio/custos/motor";
import type { ParametrosCusto } from "@/dominio/custos/parametros";

const produto: FichaProduto = {
  peso_g: 40,
  tempo_impressao_min: 120,
  pecas_por_ciclo: 1,
  taxa_falha_pct: null,
  tempo_preparo_min: 5,
  tempo_acabamento_min: 4,
  tempo_embalagem_min: 3,
  insumo_impressao_id: "insumo-pla",
  impressora_padrao_id: "imp-1",
  atributos: { cor: "preto", material: "PLA" },
};

const parametros: ParametrosCusto = {
  tarifa_kwh: 0.95,
  custo_hora_mao_obra: 30,
  taxa_falha_padrao: 0,
  desperdicio_padrao: 0,
  custo_fixo_mensal: null,
  horas_produtivas_mes: null,
  volume_mensal_estimado: null,
  metodo_rateio_fixo: "desligado",
  imposto_pct_estimado: 0.06,
  metodo_margem_padrao: "margem",
  margem_alvo_padrao: 0.25,
  markup_padrao: null,
};

describe("herança de variação", () => {
  it("variação só vale onde preencheu; atributos se somam", () => {
    const v = fichaEfetiva(produto, {
      peso_g: 55,
      taxa_falha_pct: null,
      atributos: { cor: "azul" },
    });
    expect(v.peso_g).toBe(55);
    expect(v.tempo_impressao_min).toBe(120);
    expect(v.insumo_impressao_id).toBe("insumo-pla");
    expect(v.atributos).toEqual({ cor: "azul", material: "PLA" });
    expect(camposSobrescritos({ peso_g: 55, tempo_impressao_min: null })).toEqual(["peso_g"]);
    expect(fichaEfetiva(produto, null)).toEqual(produto);
  });
});

describe("BOM", () => {
  it("separa por peça e por pedido, ignora o material de impressão e aponta item sem custo", () => {
    const r = resumirBom([
      { insumo_id: "pla", quantidade: 40, papel: "impressao", por: "peca", custo_unitario: 0.125 },
      {
        insumo_id: "ima",
        nome: "Ímã 6 mm",
        quantidade: 2,
        papel: "complementar",
        por: "peca",
        custo_unitario: 0.15,
      },
      {
        insumo_id: "etiqueta",
        quantidade: 1,
        papel: "acabamento",
        por: "peca",
        custo_unitario: 0.1,
      },
      {
        insumo_id: "caixa",
        nome: "Caixa 16",
        quantidade: 1,
        papel: "embalagem",
        por: "pedido",
        custo_unitario: 1.2,
      },
      {
        insumo_id: "plastico",
        nome: "Plástico bolha",
        quantidade: 0.2,
        papel: "embalagem",
        por: "pedido",
        custo_unitario: null,
      },
    ]);
    expect(r.por_peca).toBe(0.4);
    expect(r.por_pedido).toBe(1.2);
    expect(r.sem_custo).toEqual(["Plástico bolha"]);
    expect(r.linhas.find((l) => l.insumo_id === "pla")).toBeUndefined();
  });
});

describe("ficha para o motor (caso A1 montado a partir do produto)", () => {
  const bom = resumirBom([
    { insumo_id: "ima", quantidade: 1, papel: "complementar", por: "peca", custo_unitario: 0.4 },
  ]);
  const impressora = { depreciacao: 0.5, manutencao: 0.2, consumiveis: 0.1, energia: 0.114 };
  const canal = {
    comissao_pct: 0.14,
    taxa_pagamento_pct: 0.02,
    ads_pct: 0,
    taxa_fixa_item: 4,
    frete_subsidio: 0,
  };
  it("monta as entradas e reproduz 13,2280 de custo e 32,51 de preço", () => {
    const m = montarEntradasProduto({
      ficha: produto,
      bom,
      custo_g: 0.125,
      impressora,
      parametros,
      canal,
      margem_alvo: null,
      markup_alvo: null,
      desligados: [],
    });
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    expect(m.entradas.peca.taxa_falha).toBe(0);
    expect(m.entradas.canal?.imposto_pct).toBe(0.06);
    expect(m.entradas.margem_alvo).toBe(0.25);
    const r = calcular(m.entradas);
    expect(r.custo.custo_total).toBe(13.228);
    expect(r.preco?.margem?.preco).toBe(32.51);
  });
  it("lista tudo que falta em vez de assumir", () => {
    const m = montarEntradasProduto({
      ficha: { ...produto, peso_g: null },
      bom: resumirBom([
        {
          insumo_id: "x",
          nome: "Sem custo",
          quantidade: 1,
          papel: "complementar",
          por: "peca",
          custo_unitario: null,
        },
      ]),
      custo_g: null,
      impressora: null,
      parametros: { ...parametros, tarifa_kwh: null, imposto_pct_estimado: null },
      canal,
      margem_alvo: null,
      markup_alvo: null,
      desligados: [],
    });
    expect(m.ok).toBe(false);
    if (m.ok) return;
    expect(m.faltam).toEqual([
      "peso_g",
      "custo_g",
      "impressora",
      "tarifa_kwh",
      "imposto_pct_estimado",
      "bom_sem_custo",
    ]);
  });
  it("taxa de falha da ficha vence a padrão e sem canal não há preço", () => {
    const m = montarEntradasProduto({
      ficha: { ...produto, taxa_falha_pct: 0.1 },
      bom,
      custo_g: 0.125,
      impressora,
      parametros: { ...parametros, taxa_falha_padrao: 0.05 },
      canal: null,
      margem_alvo: 0.3,
      markup_alvo: null,
      desligados: ["embalagem"],
    });
    expect(m.ok && m.entradas.peca.taxa_falha).toBe(0.1);
    expect(m.ok && m.entradas.canal).toBeNull();
    expect(m.ok && m.entradas.margem_alvo).toBe(0.3);
    expect(m.ok && m.entradas.peca.desligados).toEqual(["embalagem"]);
  });
});
