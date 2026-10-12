import { describe, expect, it } from "vitest";
import { resumirPedido } from "./resumo-pedido";
import { podeMudarStatus, STATUS_PADRAO, validarStatus, type StatusPedido } from "./status";
import { lerData, lerPedidosCsv, MAPEAMENTO_PADRAO } from "./importacao-pedidos";

const taxas = {
  comissao_pct: 0.14,
  taxa_pagamento_pct: 0.02,
  taxa_fixa_item: 4,
  imposto_pct: 0.06,
};

describe("resumo do pedido (Anexo C1)", () => {
  const entradas = {
    itens: [
      {
        quantidade: 2,
        preco_unitario: 32.51,
        custo_unitario_estimado: 13.228,
        custo_unitario_realizado: 13.9,
      },
      {
        quantidade: 1,
        preco_unitario: 32.08,
        custo_unitario_estimado: 8.7181,
        custo_unitario_realizado: 8.5,
      },
    ],
    descontos_vendedor: 5,
    frete_cobrado: 0,
    frete_pago: 3,
    taxas,
  };
  it("reproduz a tabela do anexo", () => {
    const r = resumirPedido(entradas);
    expect(r.receita_bruta).toBe(97.1);
    expect(r.base_vendas).toBe(92.1);
    expect([r.comissao, r.taxa_pagamento, r.taxa_fixa, r.taxas_canal]).toEqual([
      12.89, 1.84, 12, 26.73,
    ]);
    expect(r.valor_a_receber).toBe(62.37);
    expect(r.imposto_estimado).toBe(5.53);
    expect(r.receita_liquida).toBe(56.84);
    expect([r.custo_estimado, r.resultado_estimado]).toEqual([35.17, 21.67]);
    expect(Math.round(r.margem_estimada! * 10000) / 100).toBe(23.53);
    expect([r.custo_realizado, r.resultado_real]).toEqual([36.3, 20.54]);
    expect(r.origem_taxas).toBe("calculadas");
  });
  it("frete cobrado entra na base de vendas mas não na base das taxas; sem imposto não há líquido", () => {
    const r = resumirPedido({
      ...entradas,
      frete_cobrado: 10,
      taxas: { ...taxas, imposto_pct: null },
    });
    expect(r.base_taxas).toBe(92.1);
    expect(r.base_vendas).toBe(102.1);
    expect(r.valor_a_receber).toBe(72.37);
    expect(r.imposto_estimado).toBeNull();
    expect(r.resultado_estimado).toBeNull();
  });
  it("taxas informadas pelo canal prevalecem e custo só aparece quando todos os itens têm", () => {
    const r = resumirPedido({
      ...entradas,
      taxas_informadas: { taxas_canal: 25, taxas_pagamento: 2 },
      itens: [{ ...entradas.itens[0], custo_unitario_realizado: null }, entradas.itens[1]],
    });
    expect(r.origem_taxas).toBe("canal");
    expect(r.taxas_canal).toBe(27);
    expect(r.valor_a_receber).toBe(62.1);
    expect(r.custo_realizado).toBeNull();
    expect(r.custo_estimado).toBe(35.17);
  });
});

describe("status do pedido", () => {
  const lista: StatusPedido[] = STATUS_PADRAO.map((s, i) => ({ ...s, id: `s${i}` }));
  const por = (c: string) => lista.find((s) => s.codigo === c)!;
  it("a lista padrão é válida e as regras pegam duplicidade", () => {
    expect(validarStatus(lista)).toEqual([]);
    expect(validarStatus(lista.map((s) => ({ ...s, gera_recebivel: true })))).toContain(
      "status_um_gera_recebivel",
    );
    expect(validarStatus(lista.map((s) => ({ ...s, padrao: false })))).toContain(
      "status_um_padrao",
    );
  });
  it("importação só avança; tela pode voltar; cancelado só reabre para recebido", () => {
    expect(podeMudarStatus(por("recebido"), por("enviado"), "importacao")).toBe(true);
    expect(podeMudarStatus(por("enviado"), por("recebido"), "importacao")).toBe(false);
    expect(podeMudarStatus(por("enviado"), por("em_producao"), "manual")).toBe(true);
    expect(podeMudarStatus(por("cancelado"), por("enviado"), "manual")).toBe(false);
    expect(podeMudarStatus(por("cancelado"), por("recebido"), "manual")).toBe(true);
    expect(podeMudarStatus(por("recebido"), por("recebido"), "manual")).toBe(false);
  });
});

describe("importação de pedidos", () => {
  it("agrupa linhas por pedido, lê números em pt-BR e datas em dois formatos", () => {
    const csv = [
      "ID do pedido,Data de criação do pedido,Status do pedido,Nome de usuário (comprador),Desconto do vendedor,Taxa de envio paga pelo comprador,Taxa de comissão,ID do produto,Nome do Produto,Quantidade,Preço acordado",
      '2501A,12/10/2026 14:30,Enviado,joao,"R$ 5,00","R$ 0,00","R$ 12,89",18698277011,Circuito F1,2,"32,51"',
      '2501A,12/10/2026 14:30,Enviado,joao,"R$ 5,00","R$ 0,00","R$ 12,89",23398385313,Kit logo,1,"32,08"',
      "2502B,13/10/2026 09:00,A pagar,maria,,,,,Suporte,1,10",
      ",13/10/2026,x,,,,,,,1,10",
      "2503C,13/10/2026,x,ana,,,,,Peça,0,10",
    ].join("\n");
    const r = lerPedidosCsv(csv, MAPEAMENTO_PADRAO.shopee);
    expect(r.faltando).toEqual([]);
    expect(r.pedidos.map((p) => [p.codigo_externo, p.itens.length, p.data_pedido])).toEqual([
      ["2501A", 2, "2026-10-12"],
      ["2502B", 1, "2026-10-13"],
    ]);
    expect(r.pedidos[0].descontos_vendedor).toBe(5);
    expect(r.pedidos[0].taxas_canal).toBe(12.89);
    expect(r.pedidos[0].itens[0]).toEqual({
      codigo_anuncio: "18698277011",
      sku: null,
      titulo: "Circuito F1",
      quantidade: 2,
      preco_unitario: 32.51,
      desconto: 0,
    });
    expect(r.pedidos[1].taxas_canal).toBeNull();
    expect(r.ignoradas).toEqual([
      { linha: 4, motivo: "sem código do pedido" },
      { linha: 5, motivo: "item sem quantidade ou preço" },
    ]);
  });
  it("aponta colunas obrigatórias ausentes e lê datas", () => {
    const r = lerPedidosCsv("a,b\n1,2", MAPEAMENTO_PADRAO.mercado_livre);
    expect(r.faltando).toEqual(["codigo_externo", "data_pedido", "item_quantidade", "item_preco"]);
    expect(lerData("2026-10-12T10:00:00Z", "iso")).toBe("2026-10-12");
    expect(lerData("12/10/2026", "br")).toBe("2026-10-12");
    expect(lerData("12-10-2026", "br")).toBeNull();
  });
});
