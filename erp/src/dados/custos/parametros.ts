import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";
import type { ClienteBanco } from "@/dados/conhecimento-escrita";
import { lerParametros, type ParametrosCusto } from "@/dominio/custos/parametros";
import type { ComponentesCusto } from "@/dominio/custos/tipos";

export type VersaoParametros = Database["public"]["Tables"]["parametros_custo"]["Row"];
export type ComponenteCusto = Database["public"]["Tables"]["componentes_custo"]["Row"];
export type ParametrosVigentes = {
  versao: number;
  vigente_desde: string;
  criado_em: string;
  dados: ParametrosCusto;
};

export async function obterParametrosVigentesCom(
  cliente: ClienteBanco,
): Promise<ParametrosVigentes | null> {
  const { data, error } = await cliente
    .from("parametros_custo_vigentes")
    .select("versao, vigente_desde, criado_em, dados")
    .maybeSingle();
  if (error) throw error;
  if (!data || data.versao == null) return null;
  return {
    versao: data.versao,
    vigente_desde: data.vigente_desde!,
    criado_em: data.criado_em!,
    dados: lerParametros(data.dados),
  };
}

export async function obterParametrosVigentes(): Promise<ParametrosVigentes | null> {
  return obterParametrosVigentesCom(await clienteServidor());
}

export async function listarVersoesParametros(): Promise<VersaoParametros[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("parametros_custo")
    .select("*")
    .order("versao", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function listarComponentesCom(cliente: ClienteBanco): Promise<ComponenteCusto[]> {
  const { data, error } = await cliente.from("componentes_custo").select("*").order("ordem");
  if (error) throw error;
  return data;
}

export async function listarComponentes(): Promise<ComponenteCusto[]> {
  return listarComponentesCom(await clienteServidor());
}

/** Chaves do motor cujos componentes estão desligados em configuração. */
export function chavesDesligadas(componentes: ComponenteCusto[]): (keyof ComponentesCusto)[] {
  return componentes
    .filter((c) => !c.ativo && c.chave_motor)
    .map((c) => c.chave_motor as keyof ComponentesCusto);
}
