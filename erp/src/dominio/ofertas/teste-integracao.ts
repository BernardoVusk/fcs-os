import type { Plataforma, StatusIntegracao } from "./plataformas";

/**
 * Status depois de um teste real. "Conectada" só com resposta aceita da API; plataformas sem API
 * de link ficam "API indisponível" mesmo com o ID de associado preenchido.
 */
export function statusDoTeste(
  plataforma: Plataforma,
  r: { configurada: boolean; ok: boolean; erro?: string },
): StatusIntegracao {
  if (plataforma === "mercado_livre") return "indisponivel";
  if (!r.configurada) return "nao_configurada";
  if (plataforma === "amazon") return r.ok ? "indisponivel" : "erro";
  if (r.ok) return "conectada";
  if (r.erro === "credencial_recusada") return "credencial_expirada";
  return "erro";
}
