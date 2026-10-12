import { separarCsv } from "@/dominio/produtos/importacao-csv";

/**
 * Mapeamento das colunas do CSV de pedidos de um canal para os campos do ERP. Cada valor é o nome
 * da coluna no arquivo (comparado sem acento e sem caixa). Vazio = coluna não existe nesse canal.
 * Os defaults por tipo de canal são hipótese: precisam ser conferidos com um arquivo real na tela de importação.
 */
export type MapeamentoPedidos = {
  codigo_externo: string;
  data_pedido: string;
  status?: string;
  cliente_nome?: string;
  cliente_contato?: string;
  descontos_vendedor?: string;
  frete_cobrado?: string;
  frete_pago?: string;
  taxas_canal?: string;
  taxas_pagamento?: string;
  total_bruto?: string;
  item_codigo_anuncio?: string;
  item_sku?: string;
  item_titulo?: string;
  item_quantidade?: string;
  item_preco?: string;
  item_desconto?: string;
  /** Formato da data: iso (2026-10-12), br (12/10/2026) ou br_hora (12/10/2026 14:30). */
  formato_data?: "iso" | "br" | "br_hora";
};

export const MAPEAMENTO_PADRAO: Record<string, MapeamentoPedidos> = {
  shopee: {
    codigo_externo: "ID do pedido",
    data_pedido: "Data de criação do pedido",
    status: "Status do pedido",
    cliente_nome: "Nome de usuário (comprador)",
    descontos_vendedor: "Desconto do vendedor",
    frete_cobrado: "Taxa de envio paga pelo comprador",
    frete_pago: "Taxa de envio reversa",
    taxas_canal: "Taxa de comissão",
    taxas_pagamento: "Taxa de transação",
    item_codigo_anuncio: "ID do produto",
    item_sku: "Número de referência SKU",
    item_titulo: "Nome do Produto",
    item_quantidade: "Quantidade",
    item_preco: "Preço acordado",
    formato_data: "br_hora",
  },
  mercado_livre: {
    codigo_externo: "# de venda",
    data_pedido: "Data da venda",
    status: "Status",
    cliente_nome: "Comprador",
    frete_cobrado: "Receita por envio (BRL)",
    taxas_canal: "Tarifa de venda e impostos (BRL)",
    item_codigo_anuncio: "# de anúncio",
    item_sku: "SKU",
    item_titulo: "Título do anúncio",
    item_quantidade: "Unidades",
    item_preco: "Preço unitário de venda do anúncio (BRL)",
    formato_data: "br_hora",
  },
  tiktok_shop: {
    codigo_externo: "Order ID",
    data_pedido: "Created Time",
    status: "Order Status",
    cliente_nome: "Buyer Username",
    frete_cobrado: "Shipping Fee After Discount",
    taxas_canal: "Platform Commission",
    item_codigo_anuncio: "Product ID",
    item_sku: "Seller SKU",
    item_titulo: "Product Name",
    item_quantidade: "Quantity",
    item_preco: "SKU Unit Original Price",
    formato_data: "iso",
  },
  outro: {
    codigo_externo: "codigo",
    data_pedido: "data",
    item_titulo: "item",
    item_quantidade: "quantidade",
    item_preco: "preco",
    formato_data: "iso",
  },
};

export type ItemImportado = {
  codigo_anuncio: string | null;
  sku: string | null;
  titulo: string | null;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
};
export type PedidoImportado = {
  codigo_externo: string;
  data_pedido: string | null;
  status_canal: string | null;
  cliente_nome: string | null;
  cliente_contato: string | null;
  descontos_vendedor: number;
  frete_cobrado: number;
  frete_pago: number;
  taxas_canal: number | null;
  taxas_pagamento: number | null;
  total_bruto: number | null;
  itens: ItemImportado[];
};
export type LeituraPedidos = {
  pedidos: PedidoImportado[];
  ignoradas: { linha: number; motivo: string }[];
  colunas: string[];
  faltando: string[];
};

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const numero = (v: string | undefined): number | null => {
  if (v == null) return null;
  const s = v
    .trim()
    .replace(/^R\$\s*/, "")
    .replace(/\s/g, "");
  if (!s) return null;
  const n = Number(
    /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, ""),
  );
  return Number.isFinite(n) ? n : null;
};

export function lerData(
  v: string | undefined,
  formato: MapeamentoPedidos["formato_data"] = "iso",
): string | null {
  if (!v) return null;
  const s = v.trim();
  if (formato === "iso") {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  }
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Uma linha por item; linhas com o mesmo código externo formam um pedido. */
export function lerPedidosCsv(csv: string, mapa: MapeamentoPedidos): LeituraPedidos {
  const matriz = separarCsv(csv);
  if (matriz.length === 0) return { pedidos: [], ignoradas: [], colunas: [], faltando: [] };
  const colunas = matriz[0].map((c) => c.trim());
  const indice = new Map(colunas.map((c, i) => [normalizar(c), i]));
  const idx = (nome: string | undefined) => (nome ? (indice.get(normalizar(nome)) ?? -1) : -1);
  const faltando = (
    ["codigo_externo", "data_pedido", "item_quantidade", "item_preco"] as const
  ).filter((k) => idx(mapa[k]) < 0);
  if (faltando.length > 0) return { pedidos: [], ignoradas: [], colunas, faltando };
  const porCodigo = new Map<string, PedidoImportado>();
  const ignoradas: LeituraPedidos["ignoradas"] = [];
  for (let n = 1; n < matriz.length; n++) {
    const r = matriz[n];
    const pegar = (chave: keyof MapeamentoPedidos) => {
      const i = idx(mapa[chave] as string | undefined);
      return i >= 0 ? r[i] : undefined;
    };
    const codigo = (pegar("codigo_externo") ?? "").trim();
    if (!codigo) {
      ignoradas.push({ linha: n, motivo: "sem código do pedido" });
      continue;
    }
    const quantidade = numero(pegar("item_quantidade"));
    const preco = numero(pegar("item_preco"));
    if (quantidade == null || quantidade <= 0 || preco == null) {
      ignoradas.push({ linha: n, motivo: "item sem quantidade ou preço" });
      continue;
    }
    const pedido = porCodigo.get(codigo) ?? {
      codigo_externo: codigo,
      data_pedido: lerData(pegar("data_pedido"), mapa.formato_data),
      status_canal: pegar("status")?.trim() || null,
      cliente_nome: pegar("cliente_nome")?.trim() || null,
      cliente_contato: pegar("cliente_contato")?.trim() || null,
      descontos_vendedor: numero(pegar("descontos_vendedor")) ?? 0,
      frete_cobrado: numero(pegar("frete_cobrado")) ?? 0,
      frete_pago: numero(pegar("frete_pago")) ?? 0,
      taxas_canal: numero(pegar("taxas_canal")),
      taxas_pagamento: numero(pegar("taxas_pagamento")),
      total_bruto: numero(pegar("total_bruto")),
      itens: [],
    };
    pedido.itens.push({
      codigo_anuncio: pegar("item_codigo_anuncio")?.trim() || null,
      sku: pegar("item_sku")?.trim() || null,
      titulo: pegar("item_titulo")?.trim() || null,
      quantidade: Math.trunc(quantidade),
      preco_unitario: preco,
      desconto: numero(pegar("item_desconto")) ?? 0,
    });
    porCodigo.set(codigo, pedido);
  }
  return { pedidos: [...porCodigo.values()], ignoradas, colunas, faltando: [] };
}

/** SHA-256 em hex de um texto (idempotência por arquivo). */
export async function hashTexto(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
