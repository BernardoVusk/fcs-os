/**
 * Modelos de mensagem. Sintaxe: {{variavel}} e seções {{#variavel}}...{{/variavel}}, que só
 * aparecem quando a variável tem valor. Linha com marcação que fica vazia some da mensagem.
 * Valores entram como texto e não são reinterpretados (um valor com "{{" não vira variável).
 */

export const VARIAVEIS = [
  "produto",
  "preco_atual",
  "preco_anterior",
  "desconto",
  "preco_pix",
  "parcelamento",
  "avaliacao",
  "loja",
  "cupom",
  "cupom_beneficio",
  "cupom_regras",
  "validade_cupom",
  "link",
  "marketplace",
  "cta",
  "atualizado_em",
] as const;
export type Variavel = (typeof VARIAVEIS)[number];
export type ValoresModelo = Partial<Record<Variavel, string | null>>;

export const VARIAVEL_DESCRICAO: Record<Variavel, string> = {
  produto: "Nome do produto",
  preco_atual: "Preço atual confirmado (com 'a partir de' quando há variações)",
  preco_anterior: "Preço anterior, só quando uma fonte confirmou",
  desconto: "Percentual de desconto informado pela fonte",
  preco_pix: "Preço no Pix, só quando a fonte informou",
  parcelamento: "Parcelamento, só quando a fonte informou",
  avaliacao: "Nota e quantidade de avaliações",
  loja: "Nome da loja ou anunciante",
  cupom: "Código do cupom vinculado",
  cupom_beneficio: "Benefício do cupom",
  cupom_regras: "Regras e compra mínima do cupom",
  validade_cupom: "Data de fim do cupom",
  link: "Link de afiliado do grupo",
  marketplace: "Nome da plataforma",
  cta: "Chamada curta escolhida por você",
  atualizado_em: "Data e hora em que o preço foi consultado",
};

/** Sempre presentes numa oferta pronta; as demais devem ficar dentro de seção. */
const SEMPRE: readonly Variavel[] = ["produto", "link", "marketplace"];

type No =
  | { t: "texto"; v: string }
  | { t: "var"; nome: string }
  | { t: "secao"; nome: string; filhos: No[] };

const TOKEN = /\{\{\s*([#/]?)\s*([a-z_]+)\s*\}\}/g;
const TEM_TOKEN = /\{\{\s*[#/]?\s*[a-z_]+\s*\}\}/;
const MARCA = "\u0000";

function analisar(corpo: string): { nos: No[]; erros: string[] } {
  const erros: string[] = [];
  const raiz: No[] = [];
  const pilha: { nome: string; filhos: No[] }[] = [];
  const atual = () => (pilha.length ? pilha[pilha.length - 1].filhos : raiz);
  let ultimo = 0;
  for (const m of corpo.matchAll(TOKEN)) {
    if (m.index! > ultimo) atual().push({ t: "texto", v: corpo.slice(ultimo, m.index) });
    ultimo = m.index! + m[0].length;
    const [, sinal, nome] = m;
    if (!VARIAVEIS.includes(nome as Variavel)) erros.push(`variavel_desconhecida:${nome}`);
    if (sinal === "#") {
      const filhos: No[] = [];
      atual().push({ t: "secao", nome, filhos });
      pilha.push({ nome, filhos });
    } else if (sinal === "/") {
      const topo = pilha.pop();
      if (!topo) erros.push(`secao_sem_abertura:${nome}`);
      else if (topo.nome !== nome) erros.push(`secao_cruzada:${topo.nome}`);
    } else atual().push({ t: "var", nome });
  }
  if (ultimo < corpo.length) atual().push({ t: "texto", v: corpo.slice(ultimo) });
  for (const p of pilha) erros.push(`secao_aberta:${p.nome}`);
  return { nos: raiz, erros };
}

function variaveisForaDeSecao(nos: No[], saida = new Set<string>()): Set<string> {
  for (const n of nos) if (n.t === "var") saida.add(n.nome);
  return saida;
}

function todasVariaveis(nos: No[], saida = new Set<string>()): Set<string> {
  for (const n of nos) {
    if (n.t === "var") saida.add(n.nome);
    if (n.t === "secao") {
      saida.add(n.nome);
      todasVariaveis(n.filhos, saida);
    }
  }
  return saida;
}

export type ValidacaoModelo = { erros: string[]; avisos: string[]; variaveis: string[] };

export function validarModelo(
  corpo: string,
  tipo: "oferta" | "cupom",
  plataforma: string | null,
): ValidacaoModelo {
  const { nos, erros } = analisar(corpo);
  const todas = todasVariaveis(nos);
  const fora = variaveisForaDeSecao(nos);
  if (tipo === "oferta" && !todas.has("link")) erros.push("link_obrigatorio");
  if (tipo === "cupom" && !todas.has("cupom")) erros.push("cupom_obrigatorio");
  if (plataforma === "amazon" && !fora.has("atualizado_em")) erros.push("amazon_sem_data");
  const avisos = [...fora]
    .filter(
      (v) =>
        VARIAVEIS.includes(v as Variavel) &&
        !SEMPRE.includes(v as Variavel) &&
        !(plataforma === "amazon" && v === "atualizado_em"),
    )
    .filter((v) => !(tipo === "cupom" && v === "cupom"))
    .map((v) => `fora_de_secao:${v}`);
  return { erros, avisos, variaveis: [...todas] };
}

function render(nos: No[], valores: ValoresModelo, ausentes: Set<string>): string {
  let s = "";
  for (const n of nos) {
    if (n.t === "texto") s += n.v;
    else if (n.t === "var") {
      const v = valores[n.nome as Variavel];
      if (v == null || v === "") ausentes.add(n.nome);
      else s += v.replaceAll(MARCA, "");
    } else {
      const v = valores[n.nome as Variavel];
      if (v != null && v !== "") s += render(n.filhos, valores, ausentes);
    }
  }
  return s;
}

/**
 * Texto final. `ausentes` lista variáveis fora de seção sem valor: a publicação fica bloqueada até
 * preencher o dado ou editar o texto (nada de "R$ " solto na mensagem).
 */
export function renderizarModelo(
  corpo: string,
  valores: ValoresModelo,
): { texto: string; ausentes: string[]; erros: string[] } {
  const marcado = corpo
    .split("\n")
    .map((l) => (TEM_TOKEN.test(l) ? `${l}${MARCA}` : l))
    .join("\n");
  const { nos, erros } = analisar(marcado);
  const ausentes = new Set<string>();
  const bruto = render(nos, valores, ausentes);
  const texto = bruto
    .split("\n")
    .filter((l) => !(l.includes(MARCA) && l.replaceAll(MARCA, "").trim() === ""))
    .map((l) => l.replaceAll(MARCA, "").replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { texto, ausentes: [...ausentes], erros };
}

/** Limite do WhatsApp para legenda de imagem e texto: 4096 caracteres. */
export const LIMITE_MENSAGEM = 4096;

export type ModeloEscolha = {
  id: string;
  tipo: "oferta" | "cupom";
  plataforma: string | null;
  padrao: boolean;
  ativo: boolean;
};

/** Modelo escolhido, senão o padrão da plataforma, senão o padrão geral do tipo. */
export function escolherModelo<T extends ModeloEscolha>(
  modelos: T[],
  tipo: "oferta" | "cupom",
  plataforma: string,
  id?: string | null,
): T | null {
  const ativos = modelos.filter((m) => m.ativo && m.tipo === tipo);
  return (
    (id ? ativos.find((m) => m.id === id) : undefined) ??
    ativos.find((m) => m.padrao && m.plataforma === plataforma) ??
    ativos.find((m) => m.padrao && m.plataforma === null) ??
    null
  );
}
