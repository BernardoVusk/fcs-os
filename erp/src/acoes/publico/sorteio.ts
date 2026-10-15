"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { inscricaoSchema, origemSorteio } from "@/dominio/sorteio/inscricao";
import { errosDoZod, lerCampos, type EstadoForm } from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";
import { Limitador } from "@/lib/limite";
import { clienteAdmin } from "@/lib/supabase/admin";

/**
 * Action pública da página /sorteio (exceção documentada em docs/arquitetura.md): não há sessão,
 * então não chama exigirEscrita. Proteções, nesta ordem: limite por IP nesta instância (melhor
 * esforço na Vercel), campo armadilha para robôs, zod, e a gravação passa pela função SQL
 * inscrever_sorteio, que só a service role executa e que revalida tudo e limita por IP no banco.
 */
const limitador = new Limitador(10, 10 * 60_000);

const CAMPOS = [
  "nome",
  "email",
  "telefone",
  "canal",
  "produto_id",
  "produto_outro",
  "aceita_contato",
  "site",
  "via",
] as const;

export async function inscreverSorteio(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const h = await headers();
  const ip =
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "desconhecido";
  if (!limitador.permitir(ip).permitido) return { erros: { _form: "muitas_tentativas" } };

  const c = lerCampos(fd, CAMPOS);
  // Campo armadilha: pessoa não vê nem preenche. Robô preencheu: finge sucesso e não grava.
  if (c.site) return { erros: {}, ok: true, mensagem: "Inscrição confirmada." };

  const r = inscricaoSchema.safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const d = r.data;
  const outro = d.produto_id === "outro";
  const { error } = await clienteAdmin("web").rpc("inscrever_sorteio", {
    p_nome: d.nome,
    p_email: d.email,
    p_telefone: d.telefone,
    p_canal: d.canal,
    p_aceita_contato: true,
    p_produto: outro ? undefined : d.produto_id,
    p_produto_outro: outro ? d.produto_outro : undefined,
    p_origem: origemSorteio(c.via),
    p_ip_hash: createHash("sha256").update(ip).digest("hex"),
    p_user_agent: h.get("user-agent")?.slice(0, 300) ?? undefined,
  });
  if (error) return { erros: { _form: chaveDoErro(error) } };
  return { erros: {}, ok: true, mensagem: "Inscrição confirmada." };
}
