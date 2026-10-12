"use server";

import { z } from "zod";
import { clienteServidor } from "@/lib/supabase/servidor";
import { usuarioAtual } from "@/lib/auth/sessao";
import { TIPOS_BUSCA, type ResultadoBusca, type TipoBusca } from "@/componentes/painel/busca-agrupar";

const schema = z.object({
  termo: z.string().trim().min(1).max(80),
  tipos: z.array(z.enum(TIPOS_BUSCA)).max(20).optional(),
});

export async function buscar(entrada: { termo: string; tipos?: TipoBusca[] }): Promise<ResultadoBusca[]> {
  const r = schema.safeParse(entrada);
  if (!r.success) return [];
  if (!(await usuarioAtual())) return [];
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("buscar_global", {
    termo: r.data.termo,
    tipos: r.data.tipos && r.data.tipos.length > 0 ? r.data.tipos : undefined,
    limite: 6,
  });
  if (error || !data) return [];
  return data as ResultadoBusca[];
}
