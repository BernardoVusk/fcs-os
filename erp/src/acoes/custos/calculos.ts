"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { errosDoZod, lerCampos, textoOpcional, type EstadoForm } from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";
import { calcular, type EntradasCalculo } from "@/dominio/custos/motor";
import { validarEntradas } from "@/dominio/custos/custo-peca";

const numero = z.number().finite();
const fracao = numero.min(0).lt(1);
const positivo = numero.min(0);

const entradasSchema = z.object({
  peca: z.object({
    peso_g: positivo,
    tempo_ciclo_min: positivo,
    pecas_por_ciclo: z.number().int().min(1),
    taxa_falha: fracao,
    desperdicio: positivo,
    custo_g: positivo,
    preparo_ciclo_min: positivo,
    acabamento_peca_min: positivo,
    embalagem_peca_min: positivo,
    custo_hora_mao_obra: positivo,
    complementares_peca: positivo,
    complementares_pedido: positivo,
    impressora: z.object({
      depreciacao: positivo,
      manutencao: positivo,
      consumiveis: positivo,
      energia: positivo,
    }),
    fixo: z.object({
      metodo: z.enum(["hora", "peca", "desligado"]),
      custo_fixo_mensal: positivo,
      horas_produtivas_mes: positivo,
      volume_mensal_estimado: positivo,
    }),
    desligados: z
      .array(
        z.enum([
          "material",
          "depreciacao",
          "manutencao",
          "consumiveis",
          "energia",
          "preparo",
          "acabamento",
          "embalagem",
          "complementares_peca",
          "fixo_rateado",
        ]),
      )
      .optional(),
  }),
  canal: z
    .object({
      comissao_pct: fracao,
      taxa_pagamento_pct: fracao,
      imposto_pct: fracao,
      ads_pct: fracao,
      taxa_fixa_item: positivo,
      frete_subsidio: positivo,
    })
    .nullable(),
  margem_alvo: fracao.nullable(),
  markup_alvo: positivo.nullable(),
});

const uuidOuNulo = z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable());

const schema = z.object({
  nome: z.string().min(1, { error: "nome_calculo_obrigatorio" }).max(120, { error: "nome_longo" }),
  canal_id: uuidOuNulo,
  insumo_id: uuidOuNulo,
  impressora_id: uuidOuNulo,
  parametros_versao: z.preprocess(
    (v) => (v === "" ? null : Number(v)),
    z.number().int().nullable(),
  ),
  metodo_margem: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(["margem", "markup"]).nullable(),
  ),
  observacoes: textoOpcional(2000),
});

/** O servidor recalcula a partir das entradas: o resultado do cliente nunca é gravado. */
export async function salvarCalculo(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("catalogo");
  const campos = lerCampos(fd, [
    "nome",
    "entradas",
    "canal_id",
    "insumo_id",
    "impressora_id",
    "parametros_versao",
    "metodo_margem",
    "observacoes",
  ] as const);
  const r = schema.safeParse(campos);
  if (!r.success) return errosDoZod(r.error);
  let entradasBrutas: unknown;
  try {
    entradasBrutas = JSON.parse(campos.entradas);
  } catch {
    return { erros: { _form: "entradas_invalidas" } };
  }
  const e = entradasSchema.safeParse(entradasBrutas);
  if (!e.success) return { erros: { _form: "entradas_invalidas" } };
  const entradas: EntradasCalculo = e.data;
  const problemas = validarEntradas(entradas.peca);
  if (problemas.length > 0) return { erros: { _form: problemas[0] } };
  const resultado = calcular(entradas);
  const metodo = r.data.metodo_margem;
  const cenario =
    metodo === "markup"
      ? resultado.preco?.markup
      : metodo === "margem"
        ? resultado.preco?.margem
        : resultado.preco?.equilibrio;
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("calculos_custo")
    .insert({
      nome: r.data.nome,
      canal_id: r.data.canal_id,
      insumo_id: r.data.insumo_id,
      impressora_id: r.data.impressora_id,
      parametros_versao: r.data.parametros_versao,
      entradas: JSON.parse(JSON.stringify(entradas)),
      resultado: JSON.parse(JSON.stringify(resultado)),
      custo_variavel: resultado.custo.custo_variavel,
      custo_unitario_total: resultado.custo.custo_total,
      preco_sugerido: cenario && cenario.viavel ? cenario.preco : null,
      metodo_margem: metodo,
      margem_alvo: entradas.margem_alvo,
      markup_alvo: entradas.markup_alvo,
      versao_motor: resultado.versao_motor,
      observacoes: r.data.observacoes,
    })
    .select("id")
    .single();
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath("/catalogo/precificacao", "layout");
  revalidatePath("/");
  return { erros: {}, ok: true, mensagem: "Cálculo salvo no histórico.", id: data.id };
}
