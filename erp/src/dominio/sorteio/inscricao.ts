import { z } from "zod";
import { normalizarTelefone } from "@/dominio/clientes/telefone";

/** Canais que o cliente escolhe na página pública; `tipo` casa com canais_venda.tipo. */
export const CANAIS_SORTEIO = [
  { tipo: "shopee", rotulo: "Shopee" },
  { tipo: "mercado_livre", rotulo: "Mercado Livre" },
  { tipo: "tiktok_shop", rotulo: "TikTok Shop" },
] as const;
export type CanalSorteio = (typeof CANAIS_SORTEIO)[number]["tipo"];

/** De onde veio o acesso à página (parâmetro ?via=). Fora da lista vira panfleto. */
export const ORIGENS_SORTEIO = ["panfleto", "instagram", "outro"] as const;
export type OrigemSorteio = (typeof ORIGENS_SORTEIO)[number];

export function origemSorteio(valor: string | null | undefined): OrigemSorteio {
  return (ORIGENS_SORTEIO as readonly string[]).includes(valor ?? "")
    ? (valor as OrigemSorteio)
    : "panfleto";
}

export const inscricaoSchema = z
  .object({
    nome: z.string().trim().min(2, { error: "nome_obrigatorio" }).max(160, { error: "nome_longo" }),
    email: z.email({ error: "email_invalido" }).max(160, { error: "email_invalido" }),
    telefone: z.string().transform((v, ctx) => {
      const n = normalizarTelefone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "telefone_invalido" });
        return z.NEVER;
      }
      return n;
    }),
    canal: z.enum(["shopee", "mercado_livre", "tiktok_shop"], { error: "canal_obrigatorio" }),
    produto_id: z.union(
      [
        z.uuid({ error: "produto_obrigatorio" }),
        z.literal("outro", { error: "produto_obrigatorio" }),
      ],
      { error: "produto_obrigatorio" },
    ),
    produto_outro: z.string().trim().max(120, { error: "produto_obrigatorio" }),
    aceita_contato: z.literal("on", { error: "consentimento_obrigatorio" }),
  })
  .superRefine((d, ctx) => {
    if (d.produto_id === "outro" && !d.produto_outro) {
      ctx.addIssue({ code: "custom", path: ["produto_outro"], message: "produto_obrigatorio" });
    }
  });
export type Inscricao = z.infer<typeof inscricaoSchema>;
