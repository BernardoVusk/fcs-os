import { describe, expect, it } from "vitest";
import { prepararEnvio, type EntradaPreparo } from "./preparo";

const G = {
  id: "3f2a9c10-1111-4222-8333-444455556666",
  nome: "Grupo A",
  campanha: null,
  tag_amazon: null,
};
const MODELOS = [
  {
    id: "m1",
    tipo: "oferta" as const,
    plataforma: null,
    padrao: true,
    ativo: true,
    corpo: "{{produto}}\n{{link}}",
  },
  {
    id: "m2",
    tipo: "cupom" as const,
    plataforma: null,
    padrao: true,
    ativo: true,
    corpo: "Cupom {{cupom}}{{#link}} {{link}}{{/link}}",
  },
];
const oferta = (
  x: Partial<NonNullable<EntradaPreparo["oferta"]>> = {},
): NonNullable<EntradaPreparo["oferta"]> => ({
  id: "aa11bb22-0000-4000-8000-000000000001",
  plataforma: "amazon",
  url_original: "https://www.amazon.com.br/dp/B0ABCDEF12",
  url_produto: null,
  link_colado: null,
  campanha: null,
  titulo: "Carrinho 1:64",
  preco_atual: null,
  preco_anterior: null,
  desconto: null,
  preco_pix: null,
  parcelamento: null,
  avaliacao: null,
  avaliacoes_qtd: null,
  loja: null,
  preco_variavel: false,
  cta: null,
  dados_atualizados_em: null,
  ...x,
});
const base = (x: Partial<EntradaPreparo> = {}): EntradaPreparo => ({
  grupo: G,
  oferta: oferta(),
  cupom: null,
  textoEditado: null,
  modeloFila: null,
  modelos: MODELOS,
  liberada: true,
  linkExistente: null,
  anunciantes: [],
  ...x,
});

describe("preparação de envio", () => {
  it("monta texto com link de afiliado do grupo (tag da Amazon)", async () => {
    const r = await prepararEnvio(base({ grupo: { ...G, tag_amazon: "grupoa-20" } }), {
      amazon: { tag: "fcs3d-20" },
    });
    expect(r).toEqual({
      ok: true,
      texto: "Carrinho 1:64\nhttps://www.amazon.com.br/dp/B0ABCDEF12?tag=grupoa-20",
      link: { url: "https://www.amazon.com.br/dp/B0ABCDEF12?tag=grupoa-20", origem: "tag" },
      linkNovo: true,
    });
  });

  it("sem link de afiliado o envio falha; trava fechada e cupom vencido também", async () => {
    expect(await prepararEnvio(base(), {})).toMatchObject({
      ok: false,
      motivo: "sem_link_afiliado",
    });
    expect(await prepararEnvio(base({ liberada: false }), { amazon: { tag: "fcs3d-20" } })).toEqual(
      { ok: false, motivo: "plataforma_bloqueada" },
    );
    const vencido = {
      plataforma: "amazon" as const,
      codigo: "X",
      descricao: "x",
      beneficio: null,
      regras: null,
      valor_minimo: null,
      fim_em: "2020-01-01T00:00:00Z",
      validade_confirmada: true,
      status: "ativo",
      inicio_em: null,
      url_referencia: null,
      fonte: "manual",
    };
    expect(await prepararEnvio(base({ cupom: vencido }), { amazon: { tag: "fcs3d-20" } })).toEqual({
      ok: false,
      motivo: "cupom_fora_da_vigencia",
    });
  });

  it("Amazon com preço de mais de 24 horas não sai", async () => {
    const r = await prepararEnvio(
      base({ oferta: oferta({ preco_atual: 10, dados_atualizados_em: "2026-10-01T00:00:00Z" }) }),
      { amazon: { tag: "fcs3d-20" } },
      { agora: new Date("2026-10-18T00:00:00Z") },
    );
    expect(r).toMatchObject({ ok: false, motivo: "dados_desatualizados" });
  });

  it("reaproveita link já gerado e respeita o texto editado da postagem", async () => {
    const r = await prepararEnvio(
      base({
        linkExistente: { url: "https://www.amazon.com.br/dp/B0ABCDEF12?tag=x-20", origem: "tag" },
        textoEditado: "Olha só: {{link}}",
      }),
      {},
    );
    expect(r).toEqual({
      ok: true,
      texto: "Olha só: https://www.amazon.com.br/dp/B0ABCDEF12?tag=x-20",
      link: { url: "https://www.amazon.com.br/dp/B0ABCDEF12?tag=x-20", origem: "tag" },
      linkNovo: false,
    });
  });

  it("cupom sozinho sai sem link quando não há link de afiliado", async () => {
    const cupom = {
      plataforma: "shopee" as const,
      codigo: "FCS10",
      descricao: "10%",
      beneficio: null,
      regras: null,
      valor_minimo: null,
      fim_em: null,
      validade_confirmada: false,
      status: "ativo",
      inicio_em: null,
      url_referencia: "https://shopee.com.br/cupom",
      fonte: "manual",
    };
    expect(await prepararEnvio(base({ oferta: null, cupom }), {})).toEqual({
      ok: true,
      texto: "Cupom FCS10",
      link: null,
      linkNovo: false,
    });
  });
});
