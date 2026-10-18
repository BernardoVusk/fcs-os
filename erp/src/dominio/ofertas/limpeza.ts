/**
 * Regras de limpeza de texto de terceiros (copiador) e de texto colado. Removem menções, convites
 * de outros grupos, chamadas da origem e links não autorizados, mas nunca apagam uma linha com
 * informação essencial (preço, validade, condição, frete, vendedor): nessas linhas só o trecho
 * proibido sai.
 */

export type RegrasLimpeza = {
  removerMencoes: boolean;
  removerConvites: boolean;
  removerLinksNaoAutorizados: boolean;
  /** Frases de chamada da origem ("entre no nosso grupo"), comparadas sem acento e sem caixa. */
  frasesRemover: string[];
};

export const REGRAS_PADRAO: RegrasLimpeza = {
  removerMencoes: true,
  removerConvites: true,
  removerLinksNaoAutorizados: true,
  frasesRemover: [
    "entre no grupo",
    "entre no nosso grupo",
    "participe do grupo",
    "link do grupo",
    "chama no privado",
    "siga nosso perfil",
    "compartilhe com os amigos",
  ],
};

const ESSENCIAL =
  /(r\$\s*\d|\d+\s*%|\bvalid|\bate\s+\d|\bexpira|\bfrete|\bcupom|\bcodigo|\bmin(imo|ima)\b|\bestoque|\blimitad|\bvendid|\bloja\b|\bparcel|\bpix\b|\bcondic)/;
const CONVITE =
  /https?:\/\/(chat\.whatsapp\.com|wa\.me|t\.me|telegram\.me|whatsapp\.com\/channel)\/\S*/gi;
const URL = /https?:\/\/[^\s<>"')\]]+/gi;
const MENCAO = /(^|\s)@[\p{L}\p{N}_.]{2,}/gu;

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export type ResultadoLimpeza = { texto: string; removidos: string[] };

/**
 * `linkPermitido` diz se uma URL pode ficar (os links da oferta são trocados antes pelo conversor;
 * qualquer outro link sai quando a regra está ligada).
 */
export function limparTexto(
  texto: string,
  regras: RegrasLimpeza,
  linkPermitido: (url: string) => boolean = () => false,
): ResultadoLimpeza {
  const removidos: string[] = [];
  const frases = regras.frasesRemover.map(semAcento).filter((f) => f.length >= 3);
  const linhas: string[] = [];
  for (const original of texto.split(/\r?\n/)) {
    let linha = original;
    if (regras.removerConvites)
      linha = linha.replace(CONVITE, (m) => {
        removidos.push(`convite:${m}`);
        return "";
      });
    if (regras.removerLinksNaoAutorizados)
      linha = linha.replace(URL, (m) => {
        if (linkPermitido(m)) return m;
        removidos.push(`link:${m}`);
        return "";
      });
    if (regras.removerMencoes)
      linha = linha.replace(MENCAO, (m, antes: string) => {
        removidos.push(`mencao:${m.trim()}`);
        return antes;
      });
    const normal = semAcento(linha);
    const essencial = ESSENCIAL.test(normal);
    const frase = frases.find((f) => normal.includes(f));
    if (frase && !essencial) {
      removidos.push(`frase:${frase}`);
      continue;
    }
    linhas.push(linha.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+$/, ""));
  }
  return {
    texto: linhas
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    removidos,
  };
}

/** Linhas com informação essencial do texto original que não estão no resultado (deve ser vazio). */
export function essenciaisPerdidas(original: string, resultado: string): string[] {
  const res = semAcento(resultado);
  return original
    .split(/\r?\n/)
    .map((l) => l.replace(URL, "").replace(CONVITE, "").trim())
    .filter((l) => l && ESSENCIAL.test(semAcento(l)))
    .filter((l) => {
      const precos = semAcento(l).match(/r\$\s*[\d.,]+/g) ?? [];
      return precos.some((p) => !res.includes(p));
    });
}
