import { limparTexto, essenciaisPerdidas, REGRAS_PADRAO, type RegrasLimpeza } from "./limpeza";
import { hostNaLista, type Plataforma } from "./plataformas";
import { lerUrlOferta, urlsDoTexto, type AnuncianteAwin, type UrlLida } from "./urls";

/**
 * Decisão do copiador sobre uma mensagem de grupo de origem autorizado. Regras: palavra excluída
 * ignora; palavra obrigatória ausente ignora; precisa de link elegível (plataforma permitida,
 * domínio não bloqueado). Mais de um produto, Mercado Livre (link só pelo portal) ou informação
 * essencial perdida na limpeza vão para revisão manual. O link do produto vira {{link}}, trocado
 * pelo nosso link de cada grupo na preparação.
 */

export type FiltrosCopiador = {
  incluir: string[];
  excluir: string[];
  dominiosBloqueados: string[];
};

export const FILTROS_PADRAO: FiltrosCopiador = { incluir: [], excluir: [], dominiosBloqueados: [] };

export type Decisao =
  | { acao: "ignorar"; motivo: string }
  | {
      acao: "publicar" | "revisar";
      motivo: string | null;
      lida: UrlLida;
      linkOriginal: string;
      texto: string;
      removidos: string[];
      chave: string | null;
      hash: string;
      titulo: string | null;
    };

export const STATUS_AUTOMACAO: Record<string, string> = {
  rascunho: "Prévia (nada sai)",
  ativa: "Ativa",
  pausada: "Pausada",
  encerrada: "Encerrada",
  erro: "Erro",
};

export const MOTIVO_COPIADOR_ROTULO: Record<string, string> = {
  palavra_excluida: "Tem palavra excluída",
  sem_palavra_obrigatoria: "Sem palavra obrigatória",
  sem_link_elegivel: "Sem link de plataforma permitida",
  varios_produtos: "Mais de um produto na mensagem",
  link_manual_obrigatorio: "Mercado Livre: cole o nosso link do portal",
  informacao_essencial: "A limpeza tirou preço ou condição: revise",
  revisao_manual: "Revisão manual ligada",
  duplicado: "Oferta repetida dentro da janela",
  plataforma_bloqueada: "Plataforma sem canal liberado",
  automacao_inativa: "Automação pausada ou encerrada",
  sem_destino: "Sem grupo de destino ativo",
};

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Dois FNV-1a de 32 bits (sementes diferentes) em hex: identifica texto repetido sem guardar o texto. */
export function hashTexto(texto: string): string {
  const t = sem(texto).replace(/\s+/g, " ").trim();
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x01000193) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

function primeiraLinha(texto: string): string | null {
  const l = texto
    .split("\n")
    .map((x) => x.replace(/[*_~]/g, "").trim())
    .find((x) => x.length >= 4 && !/^https?:\/\//.test(x) && !x.includes("{{link}}"));
  return l ? l.slice(0, 300) : null;
}

export function decidirMensagem(
  texto: string,
  cfg: {
    plataformas: Plataforma[];
    filtros: FiltrosCopiador;
    limpeza: RegrasLimpeza;
    revisaoManual: boolean;
  },
  anunciantes: AnuncianteAwin[] = [],
): Decisao {
  const n = sem(texto);
  if (cfg.filtros.excluir.some((p) => p.trim() && n.includes(sem(p.trim()))))
    return { acao: "ignorar", motivo: "palavra_excluida" };
  const obrigatorias = cfg.filtros.incluir.filter((p) => p.trim());
  if (obrigatorias.length && !obrigatorias.some((p) => n.includes(sem(p.trim()))))
    return { acao: "ignorar", motivo: "sem_palavra_obrigatoria" };

  const elegiveis: { url: string; lida: UrlLida }[] = [];
  for (const url of urlsDoTexto(texto)) {
    const r = lerUrlOferta(url, anunciantes);
    if (!r.ok || !cfg.plataformas.includes(r.lida.plataforma)) continue;
    if (
      cfg.filtros.dominiosBloqueados.some(
        (d) => d.trim() && hostNaLista(r.lida.host, [d.trim().toLowerCase()]),
      )
    )
      continue;
    elegiveis.push({ url, lida: r.lida });
  }
  if (!elegiveis.length) return { acao: "ignorar", motivo: "sem_link_elegivel" };
  const principal = elegiveis[0];
  const produtos = new Set(elegiveis.map((e) => e.lida.chaveProduto ?? e.url));

  const escapado = texto.replaceAll("{{", "{ {").replaceAll("}}", "} }");
  const limpo = limparTexto(
    escapado,
    { ...REGRAS_PADRAO, ...cfg.limpeza },
    (u) => u === principal.url,
  );
  let final = limpo.texto.includes(principal.url)
    ? limpo.texto.replace(principal.url, "{{link}}")
    : `${limpo.texto}\n\n{{link}}`;
  for (const e of elegiveis.slice(1)) final = final.replaceAll(e.url, "");
  final = final
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const perdeu = essenciaisPerdidas(escapado, final).length > 0;
  let motivo: string | null = null;
  if (produtos.size > 1) motivo = "varios_produtos";
  else if (principal.lida.plataforma === "mercado_livre") motivo = "link_manual_obrigatorio";
  else if (perdeu) motivo = "informacao_essencial";
  else if (cfg.revisaoManual) motivo = "revisao_manual";

  return {
    acao: motivo ? "revisar" : "publicar",
    motivo,
    lida: principal.lida,
    linkOriginal: principal.url,
    texto: final.slice(0, 4000),
    removidos: limpo.removidos,
    chave: principal.lida.chaveProduto,
    hash: hashTexto(final.replace("{{link}}", "")),
    titulo: primeiraLinha(final),
  };
}
