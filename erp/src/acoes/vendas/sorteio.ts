"use server";

import { revalidatePath } from "next/cache";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { chaveDoErro } from "@/lib/erros-pt";
import type { ResultadoAcao } from "@/lib/forms";
import { referenciaValida } from "@/dominio/sorteio/referencia";

/** Sorteia o ganhador do mês. Só o dono; a função SQL repete a checagem. */
export async function realizarSorteio(referencia: string): Promise<ResultadoAcao> {
  let usuario;
  try {
    usuario = await exigirEscrita("vendas");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (usuario.papel !== "dono") return { ok: false, erro: "sem_permissao" };
  if (!referenciaValida(referencia)) return { ok: false, erro: "data_invalida" };
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("realizar_sorteio", { p_referencia: referencia });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  const ganhador = data as { nome?: string } | null;
  revalidatePath("/vendas/sorteio");
  return { ok: true, mensagem: `Ganhador do mês: ${ganhador?.nome ?? "sorteado"}.` };
}
