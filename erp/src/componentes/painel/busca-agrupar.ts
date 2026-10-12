export const TIPOS_BUSCA = [
  "canal",
  "categoria",
  "unidade",
  "insumo",
  "lote",
  "fornecedor",
  "compra",
  "impressora",
  "calculo",
  "produto",
  "ordem",
  "pedido",
  "cliente",
  "lancamento",
  "conhecimento",
  "tarefa",
] as const;
export type TipoBusca = (typeof TIPOS_BUSCA)[number];

export const ROTULO_TIPO: Record<TipoBusca, string> = {
  canal: "Canais",
  categoria: "Categorias",
  unidade: "Unidades",
  insumo: "Insumos",
  lote: "Lotes",
  fornecedor: "Fornecedores",
  compra: "Compras",
  impressora: "Impressoras",
  calculo: "Cálculos de custo",
  produto: "Produtos",
  ordem: "Ordens de produção",
  pedido: "Pedidos",
  cliente: "Clientes",
  lancamento: "Lançamentos",
  conhecimento: "Conhecimento",
  tarefa: "Tarefas",
};

/** Tipos que a função buscar_global já atende. Cada fase acrescenta os seus. */
export const TIPOS_DISPONIVEIS: TipoBusca[] = [
  "canal",
  "categoria",
  "unidade",
  "conhecimento",
  "insumo",
  "lote",
  "fornecedor",
  "compra",
  "impressora",
  "calculo",
  "produto",
  "ordem",
];

export type ResultadoBusca = {
  tipo: TipoBusca;
  id: string;
  titulo: string;
  subtitulo: string | null;
  rota: string;
  pontuacao: number;
};
export type GrupoBusca = { tipo: TipoBusca; rotulo: string; itens: ResultadoBusca[] };

/** Agrupa na ordem de TIPOS_BUSCA; dentro do grupo mantém a ordem recebida (já vem por pontuação). */
export function agruparResultados(lista: ResultadoBusca[]): GrupoBusca[] {
  const porTipo = new Map<TipoBusca, ResultadoBusca[]>();
  for (const item of lista) {
    const atual = porTipo.get(item.tipo) ?? [];
    atual.push(item);
    porTipo.set(item.tipo, atual);
  }
  return TIPOS_BUSCA.filter((t) => porTipo.has(t)).map((t) => ({
    tipo: t,
    rotulo: ROTULO_TIPO[t],
    itens: porTipo.get(t)!,
  }));
}
