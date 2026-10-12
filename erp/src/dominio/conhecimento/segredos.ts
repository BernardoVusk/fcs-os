const PADROES: { nome: string; regex: RegExp }[] = [
  { nome: "variavel_sensivel", regex: /\b([A-Z_]*(?:KEY|SECRET|TOKEN|PASSWORD|SENHA)[A-Z_]*)\s*[=:]\s*\S{8,}/ },
  { nome: "chave_privada", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { nome: "jwt", regex: /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/ },
  { nome: "chave_openai", regex: /\bsk-[A-Za-z0-9_-]{16,}/ },
  { nome: "chave_aws", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { nome: "token_slack", regex: /\bxox[bpas]-[A-Za-z0-9-]{10,}/ },
  { nome: "token_github", regex: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { nome: "token_supabase", regex: /\bsbp_[a-f0-9]{20,}/ },
  { nome: "token_fcs", regex: /\bfcs_[A-Za-z0-9_-]{20,}/ },
];

export type ResultadoSegredo = { achou: false } | { achou: true; padrao: string };

/** Procura chaves, tokens e senhas em texto livre antes de gravar na base. */
export function contemSegredo(texto: string | null | undefined): ResultadoSegredo {
  if (!texto) return { achou: false };
  for (const p of PADROES) if (p.regex.test(texto)) return { achou: true, padrao: p.nome };
  return { achou: false };
}
