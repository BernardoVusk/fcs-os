export const ESCOPOS = [
  "conhecimento:ler",
  "conhecimento:escrever",
  "custos:ler",
  "operacao:ler",
] as const;
export type Escopo = (typeof ESCOPOS)[number];
export const ESCOPO_ROTULO: Record<Escopo, string> = {
  "conhecimento:ler": "Ler a base de conhecimento",
  "conhecimento:escrever": "Gravar e atualizar conhecimentos",
  "custos:ler": "Ler regras e custos de produtos",
  "operacao:ler": "Ler alertas e situação da operação",
};

export const FERRAMENTAS_MCP = [
  "kb_buscar",
  "kb_obter",
  "kb_salvar",
  "kb_atualizar",
  "kb_decisoes",
  "custos_regras",
  "produto_custo",
  "alertas_abertos",
  "estoque_insumo",
] as const;
export type FerramentaMcp = (typeof FERRAMENTAS_MCP)[number];

const ESCOPO_POR_FERRAMENTA: Record<FerramentaMcp, Escopo> = {
  kb_buscar: "conhecimento:ler",
  kb_obter: "conhecimento:ler",
  kb_decisoes: "conhecimento:ler",
  kb_salvar: "conhecimento:escrever",
  kb_atualizar: "conhecimento:escrever",
  custos_regras: "custos:ler",
  produto_custo: "custos:ler",
  alertas_abertos: "operacao:ler",
  estoque_insumo: "operacao:ler",
};

export function escopoPara(ferramenta: FerramentaMcp): Escopo {
  return ESCOPO_POR_FERRAMENTA[ferramenta];
}

export function temEscopo(escopos: readonly string[], necessario: Escopo): boolean {
  return escopos.includes(necessario);
}

export function lerEscopos(valores: readonly string[]): Escopo[] {
  return ESCOPOS.filter((e) => valores.includes(e));
}
