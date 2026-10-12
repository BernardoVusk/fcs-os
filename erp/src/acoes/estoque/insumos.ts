"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  campoValor,
  errosDoZod,
  lerCampos,
  textoOpcional,
  type EstadoForm,
  type ResultadoAcao,
} from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";
import { TIPOS_INSUMO } from "@/dominio/estoque/conversao";

const insumoSchema = z.object({
  tipo: z.enum(TIPOS_INSUMO, { error: "tipo_invalido" }),
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(120, { error: "nome_longo" }),
  codigo_interno: z.preprocess(
    (v) => (v === "" ? null : v),
    z
      .string()
      .regex(/^[A-Za-z0-9._-]{1,30}$/, { error: "codigo_interno_invalido" })
      .nullable(),
  ),
  unidade_base: z.string().regex(/^[a-z]{1,6}$/, { error: "unidade_invalida" }),
  categoria_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
  estoque_minimo: campoValor,
  localizacao: textoOpcional(120),
  origem_custo: z.enum(["media", "ultima_entrada", "manual"], { error: "tipo_invalido" }),
  custo_manual: campoValor,
  observacoes: textoOpcional(2000),
  fabricante: textoOpcional(80),
  material: textoOpcional(40),
  cor: textoOpcional(40),
  cor_hex: z.preprocess(
    (v) => (v === "" ? null : v),
    z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, { error: "cor_invalida" })
      .nullable(),
  ),
  diametro_mm: campoValor,
  peso_util_padrao_g: campoValor,
  peso_carretel_vazio_g: campoValor,
  temperatura_bico: campoValor,
  temperatura_mesa: campoValor,
  notas_tecnicas: textoOpcional(2000),
});

const CAMPOS = [
  "id",
  "ativo",
  "tipo",
  "nome",
  "codigo_interno",
  "unidade_base",
  "categoria_id",
  "estoque_minimo",
  "localizacao",
  "origem_custo",
  "custo_manual",
  "observacoes",
  "fabricante",
  "material",
  "cor",
  "cor_hex",
  "diametro_mm",
  "peso_util_padrao_g",
  "peso_carretel_vazio_g",
  "temperatura_bico",
  "temperatura_mesa",
  "notas_tecnicas",
] as const;

export async function salvarInsumo(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("estoque");
  const campos = lerCampos(fd, CAMPOS);
  const r = insumoSchema.safeParse(campos);
  if (!r.success) return errosDoZod(r.error);
  const d = r.data;
  if (d.origem_custo === "manual" && d.custo_manual == null)
    return { erros: { custo_manual: "numero_invalido" } };
  const atributos =
    d.tipo === "filamento"
      ? {
          fabricante: d.fabricante,
          material: d.material,
          cor: d.cor,
          cor_hex: d.cor_hex,
          diametro_mm: d.diametro_mm,
          peso_util_padrao_g: d.peso_util_padrao_g,
          peso_carretel_vazio_g: d.peso_carretel_vazio_g,
          temperatura_bico: d.temperatura_bico,
          temperatura_mesa: d.temperatura_mesa,
          notas_tecnicas: d.notas_tecnicas,
        }
      : {};
  const linha = {
    tipo: d.tipo,
    nome: d.nome,
    codigo_interno: d.codigo_interno,
    unidade_base: d.tipo === "filamento" ? "g" : d.unidade_base,
    categoria_id: d.categoria_id,
    estoque_minimo: d.estoque_minimo ?? 0,
    localizacao: d.localizacao,
    origem_custo: d.origem_custo,
    custo_manual: d.custo_manual,
    observacoes: d.observacoes,
    atributos,
    ativo: campos.id ? campos.ativo === "sim" : true,
  };
  const supabase = await clienteServidor();
  const resultado = campos.id
    ? await supabase.from("insumos").update(linha).eq("id", campos.id).select("id").single()
    : await supabase.from("insumos").insert(linha).select("id").single();
  if (resultado.error) return { erros: { _form: chaveDoErro(resultado.error) } };
  revalidatePath("/estoque", "layout");
  revalidatePath("/");
  return {
    erros: {},
    ok: true,
    mensagem: campos.id ? "Insumo salvo." : "Insumo cadastrado.",
    id: resultado.data.id,
  };
}

export async function alternarInsumo(id: string, ativo: boolean): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("estoque");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { error } = await supabase.from("insumos").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/estoque", "layout");
  return { ok: true, mensagem: ativo ? "Insumo reativado." : "Insumo inativado." };
}
