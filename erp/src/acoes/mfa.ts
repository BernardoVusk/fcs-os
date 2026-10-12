"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { usuarioAtual } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { errosDoZod, lerCampos, type EstadoForm } from "@/lib/forms";

const codigo = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: "codigo_mfa_invalido" });

export type InscricaoMfa = { factorId: string; qr: string; segredo: string; uri: string };

/** Começa a inscrição TOTP: devolve QR (SVG) e segredo para o aplicativo autenticador. */
export async function iniciarMfa(): Promise<InscricaoMfa | { erro: string }> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erro: "sem_permissao" };
  const supabase = await clienteServidor();
  // Remove inscrições começadas e não confirmadas, para não acumular fatores pendentes.
  const { data: fatores } = await supabase.auth.mfa.listFactors();
  for (const f of fatores?.all ?? [])
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "FCS ERP",
  });
  if (error || !data) return { erro: "mfa_indisponivel" };
  return {
    factorId: data.id,
    qr: data.totp.qr_code,
    segredo: data.totp.secret,
    uri: data.totp.uri,
  };
}

/** Confirma a inscrição com o primeiro código do aplicativo; a sessão sobe para AAL2. */
export async function confirmarMfa(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { _form: "sem_permissao" } };
  const c = lerCampos(fd, ["factor_id", "codigo"] as const);
  const r = z.object({ factor_id: z.uuid(), codigo }).safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { data: desafio, error: e1 } = await supabase.auth.mfa.challenge({
    factorId: r.data.factor_id,
  });
  if (e1 || !desafio) return { erros: { _form: "mfa_indisponivel" } };
  const { error } = await supabase.auth.mfa.verify({
    factorId: r.data.factor_id,
    challengeId: desafio.id,
    code: r.data.codigo,
  });
  if (error) return { erros: { codigo: "codigo_mfa_invalido" } };
  revalidatePath("/perfil");
  return { erros: {}, ok: true, mensagem: "Verificação em duas etapas ativada." };
}

/** Desativa: exige um código válido do aplicativo atual. */
export async function removerMfa(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { _form: "sem_permissao" } };
  const c = lerCampos(fd, ["factor_id", "codigo"] as const);
  const r = z.object({ factor_id: z.uuid(), codigo }).safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { data: desafio, error: e1 } = await supabase.auth.mfa.challenge({
    factorId: r.data.factor_id,
  });
  if (e1 || !desafio) return { erros: { _form: "mfa_indisponivel" } };
  const { error: e2 } = await supabase.auth.mfa.verify({
    factorId: r.data.factor_id,
    challengeId: desafio.id,
    code: r.data.codigo,
  });
  if (e2) return { erros: { codigo: "codigo_mfa_invalido" } };
  const { error } = await supabase.auth.mfa.unenroll({ factorId: r.data.factor_id });
  if (error) return { erros: { _form: "mfa_indisponivel" } };
  revalidatePath("/perfil");
  return { erros: {}, ok: true, mensagem: "Verificação em duas etapas desativada." };
}

/** Segunda etapa do login: código do aplicativo para o fator já verificado. */
export async function verificarMfa(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const c = lerCampos(fd, ["codigo", "voltar"] as const);
  const r = z
    .object({ codigo, voltar: z.string().max(300).optional() })
    .safeParse({ ...c, voltar: c.voltar || undefined });
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { data: fatores } = await supabase.auth.mfa.listFactors();
  const fator = fatores?.totp.find((f) => f.status === "verified");
  if (!fator) return { erros: { _form: "mfa_indisponivel" } };
  const { data: desafio, error: e1 } = await supabase.auth.mfa.challenge({ factorId: fator.id });
  if (e1 || !desafio) return { erros: { _form: "mfa_indisponivel" } };
  const { error } = await supabase.auth.mfa.verify({
    factorId: fator.id,
    challengeId: desafio.id,
    code: r.data.codigo,
  });
  if (error) return { erros: { codigo: "codigo_mfa_invalido" } };
  const v = r.data.voltar;
  redirect(v && v.startsWith("/") && !v.startsWith("//") ? v : "/");
}
