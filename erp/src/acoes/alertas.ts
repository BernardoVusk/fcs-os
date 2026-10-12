"use server";

import { revalidatePath } from "next/cache";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { chaveDoErro } from "@/lib/erros-pt";
import type { ResultadoAcao } from "@/lib/forms";

function revalidar() {
  revalidatePath("/alertas");
  revalidatePath("/", "layout");
}

export async function resolverAlerta(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("alertas");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("alertas")
    .update({ resolvido_em: new Date().toISOString() })
    .eq("id", id)
    .is("resolvido_em", null);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidar();
  return { ok: true, mensagem: "Alerta resolvido." };
}

/** Esconde o alerta por N dias; se a condição continuar, ele volta quando o silêncio acabar. */
export async function silenciarAlerta(id: string, dias: number): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("alertas");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const n = Math.min(Math.max(Math.round(dias), 1), 90);
  const ate = new Date(Date.now() + n * 86_400_000).toISOString();
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("alertas")
    .update({ silenciado_ate: ate })
    .eq("id", id)
    .is("resolvido_em", null);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidar();
  return { ok: true, mensagem: `Silenciado por ${n} dia(s).` };
}

export async function reativarAlerta(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("alertas");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { error } = await supabase.from("alertas").update({ silenciado_ate: null }).eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidar();
  return { ok: true, mensagem: "Alerta reativado." };
}

/** Roda a mesma verificação do agendamento diário agora. */
export async function gerarAlertasAgora(): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("alertas");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("gerar_alertas");
  if (error) return { ok: false, erro: chaveDoErro(error) };
  const r = data as { abertos: number; atualizados: number; resolvidos: number };
  revalidar();
  return {
    ok: true,
    mensagem: `Verificação feita: ${r.abertos} novo(s), ${r.atualizados} atualizado(s), ${r.resolvidos} resolvido(s).`,
  };
}
