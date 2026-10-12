import { describe, expect, it } from "vitest";
import {
  consumoPorMes,
  custoRealVsEstimado,
  desempenhoImpressoras,
  rentabilidadePorCanal,
  rentabilidadePorProduto,
  variacao,
  type LinhaOrdem,
  type LinhaVendaItem,
} from "./agregacoes";
import { escaparCsv, gerarCsv, nomeArquivo, protegerFormula } from "./csv";
import { arquivosXlsx, crc32, gerarXlsx, lerZipStored, referenciaCelula } from "./xlsx";

describe("csv", () => {
  it("protege fórmula, escapa aspas e ponto e vírgula, número com vírgula, BOM e CRLF", () => {
    expect(protegerFormula("=SOMA(A1)")).toBe("'=SOMA(A1)");
    expect(protegerFormula("+55")).toBe("'+55");
    expect(protegerFormula("Porsche 911")).toBe("Porsche 911");
    expect(escaparCsv('Reel "F1"; capa')).toBe('"Reel ""F1""; capa"');
    expect(escaparCsv(1234.5)).toBe("1234,5");
    expect(escaparCsv(null)).toBe("");
    expect(escaparCsv(true)).toBe("sim");
    const csv = gerarCsv(["produto", "receita"], [["Miniatura F1", 97.1]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿produto;receita\r\nMiniatura F1;97,1");
    expect(nomeArquivo("Rentabilidade por produto", "csv", "2026-10-12")).toBe(
      "rentabilidade-por-produto-2026-10-12.csv",
    );
  });
});

describe("xlsx", () => {
  it("referências de célula e crc32 conhecidos", () => {
    expect(referenciaCelula(0, 0)).toBe("A1");
    expect(referenciaCelula(25, 1)).toBe("Z2");
    expect(referenciaCelula(26, 2)).toBe("AA3");
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
  it("gera um zip legível com as partes do pacote, inline strings com acento e fórmula como texto", () => {
    const bytes = gerarXlsx([
      {
        nome: "Rentabilidade",
        cabecalho: ["Produto", "Receita"],
        linhas: [
          ["Miniatura açaí", 97.1],
          ["=1+1", null],
        ],
      },
    ]);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    const partes = lerZipStored(bytes);
    expect(partes.map((p) => p.caminho)).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/worksheets/sheet1.xml",
    ]);
    const planilha = partes[4].conteudo;
    expect(planilha).toContain(
      '<c r="A2" t="inlineStr"><is><t xml:space="preserve">Miniatura açaí</t></is></c>',
    );
    expect(planilha).toContain('<c r="B2"><v>97.1</v></c>');
    expect(planilha).toContain("'=1+1");
    expect(planilha).not.toContain("<f>");
    expect(partes[2].conteudo).toContain('name="Rentabilidade"');
    expect(arquivosXlsx([]).length).toBe(5);
  });
});

const itens: LinhaVendaItem[] = [
  {
    pedido_id: "p1",
    pedido_codigo: "PED-1",
    data_pagamento: "2026-10-01",
    canal_id: "c1",
    canal_nome: "Shopee",
    produto_id: "a",
    produto_nome: "Mini F1",
    variacao_id: null,
    quantidade: 2,
    receita: 65.02,
    custo_estimado: 13.228,
    custo_realizado: 13.9,
  },
  {
    pedido_id: "p2",
    pedido_codigo: "PED-2",
    data_pagamento: "2026-10-03",
    canal_id: "c1",
    canal_nome: "Shopee",
    produto_id: "a",
    produto_nome: "Mini F1",
    variacao_id: null,
    quantidade: 1,
    receita: 32.51,
    custo_estimado: 13.228,
    custo_realizado: null,
  },
  {
    pedido_id: "p2",
    pedido_codigo: "PED-2",
    data_pagamento: "2026-10-03",
    canal_id: "c1",
    canal_nome: "Shopee",
    produto_id: null,
    produto_nome: null,
    variacao_id: null,
    quantidade: 1,
    receita: "32.08",
    custo_estimado: 8.7181,
    custo_realizado: 8.5,
  },
];

describe("rentabilidade", () => {
  it("por produto soma receita e custo; custo realizado fica nulo se algum item não tem", () => {
    const r = rentabilidadePorProduto(itens);
    expect(r.length).toBe(2);
    expect(r[0]).toEqual({
      produto_id: "a",
      produto: "Mini F1",
      quantidade: 3,
      receita: 97.53,
      custo_estimado: 39.68,
      custo_realizado: null,
      resultado_estimado: 57.85,
      resultado_real: null,
      margem_estimada: 0.5931,
      margem_real: null,
      pedidos: 2,
    });
    expect(r[1].produto).toBe("Itens avulsos");
    expect(r[1].resultado_real).toBe(23.58);
  });
  it("por canal usa o resumo; taxa média e margem", () => {
    const r = rentabilidadePorCanal([
      {
        pedido_id: "p1",
        codigo: "PED-1",
        data_pagamento: "2026-10-01",
        canal_id: "c1",
        canal_nome: "Shopee",
        receita_bruta: 97.1,
        base_vendas: 92.1,
        taxas_canal: 26.73,
        valor_a_receber: 62.37,
        imposto_estimado: 5.53,
        receita_liquida: 56.84,
        custo_estimado: 35.17,
        custo_realizado: 36.3,
        resultado_estimado: 21.67,
        resultado_real: 20.54,
      },
      {
        pedido_id: "p2",
        codigo: "PED-2",
        data_pagamento: "2026-10-02",
        canal_id: "c1",
        canal_nome: "Shopee",
        receita_bruta: 50,
        base_vendas: 50,
        taxas_canal: 10,
        valor_a_receber: 40,
        imposto_estimado: 3,
        receita_liquida: 37,
        custo_estimado: null,
        custo_realizado: null,
        resultado_estimado: null,
        resultado_real: null,
      },
    ]);
    expect(r).toEqual([
      {
        canal_id: "c1",
        canal: "Shopee",
        pedidos: 2,
        base_vendas: 142.1,
        taxas_canal: 36.73,
        receita_liquida: 93.84,
        custo_estimado: null,
        resultado_estimado: null,
        margem_estimada: null,
        resultado_real: null,
        taxa_media: 0.2585,
      },
    ]);
  });
});

const ordens: LinhaOrdem[] = [
  {
    ordem_id: "o1",
    codigo: "OP-0001",
    fim_real: "2026-10-02T10:00:00Z",
    produto_id: "a",
    produto_nome: "Mini F1",
    impressora_id: "i1",
    impressora_nome: "Ender",
    quantidade_aprovada: 5,
    quantidade_perdida: 1,
    tempo_previsto_min: 300,
    tempo_real_min: 330,
    custo_estimado: 52.85,
    custo_realizado: 56.1,
  },
  {
    ordem_id: "o2",
    codigo: "OP-0002",
    fim_real: "2026-10-05T10:00:00Z",
    produto_id: "a",
    produto_nome: "Mini F1",
    impressora_id: "i1",
    impressora_nome: "Ender",
    quantidade_aprovada: 5,
    quantidade_perdida: 0,
    tempo_previsto_min: 300,
    tempo_real_min: 290,
    custo_estimado: 52.85,
    custo_realizado: 50.2,
  },
  {
    ordem_id: "o3",
    codigo: "OP-0003",
    fim_real: "2026-10-06T10:00:00Z",
    produto_id: "b",
    produto_nome: "Vaso",
    impressora_id: null,
    impressora_nome: null,
    quantidade_aprovada: 0,
    quantidade_perdida: 2,
    tempo_previsto_min: 100,
    tempo_real_min: 120,
    custo_estimado: 10,
    custo_realizado: 12,
  },
];

describe("produção", () => {
  it("custo real x estimado por produto ignora ordem sem peça aprovada", () => {
    const r = custoRealVsEstimado(ordens);
    expect(r).toEqual([
      {
        produto_id: "a",
        produto: "Mini F1",
        ordens: 2,
        pecas: 10,
        estimado_total: 105.7,
        realizado_total: 106.3,
        estimado_por_peca: 10.57,
        realizado_por_peca: 10.63,
        desvio: 0.6,
        desvio_pct: 0.0057,
      },
    ]);
  });
  it("desempenho por impressora: horas, falha real e desvio de tempo", () => {
    const r = desempenhoImpressoras(ordens);
    expect(r[0]).toEqual({
      impressora_id: "i1",
      impressora: "Ender",
      ordens: 2,
      horas_reais: 10.33,
      horas_previstas: 10,
      aprovadas: 10,
      perdidas: 1,
      falha_real: 0.0909,
      desvio_tempo_pct: 0.0333,
    });
    expect(r[1].impressora).toBe("Sem impressora");
    expect(r[1].falha_real).toBe(1);
  });
  it("consumo por mês do mais recente ao mais antigo, com quebra por insumo", () => {
    const r = consumoPorMes([
      {
        mes: "2026-09",
        insumo_id: "x",
        insumo_nome: "PLA preto",
        quantidade_g: 350,
        valor: 35.5775,
      },
      {
        mes: "2026-10",
        insumo_id: "x",
        insumo_nome: "PLA preto",
        quantidade_g: "700",
        valor: "72.491",
      },
      { mes: "2026-10", insumo_id: "y", insumo_nome: "PETG", quantidade_g: 100, valor: 11.77 },
    ]);
    expect(r.map((m) => m.mes)).toEqual(["2026-10", "2026-09"]);
    expect(r[0].quantidade_g).toBe(800);
    expect(r[0].valor).toBe(84.26);
    expect(r[0].por_insumo[0]).toEqual({
      insumo_id: "x",
      insumo: "PLA preto",
      quantidade_g: 700,
      valor: 72.49,
    });
  });
  it("variação relativa", () => {
    expect(variacao(120, 100)).toBe(0.2);
    expect(variacao(80, 100)).toBe(-0.2);
    expect(variacao(10, 0)).toBe(null);
    expect(variacao(null, 5)).toBe(null);
  });
});
