"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita, usuarioAtual } from "@/lib/auth/sessao";
import { podeLer } from "@/lib/auth/papeis";
import { clienteServidor } from "@/lib/supabase/servidor";
import { chaveDoErro } from "@/lib/erros-pt";
import { errosDoZod, type EstadoForm, type ResultadoAcao } from "@/lib/forms";
import { VERSAO_ACEITE } from "@/dominio/ofertas/risco";
import { estadoConexao } from "@/dados/ofertas/whatsapp";

const ROTA = "/ofertas/numeros";

async function dono() {
  try {
    return await exigirEscrita("usuarios");
  } catch {
    return null;
  }
}

const telefone = z.preprocess(
  (v) => {
    const d = String(v ?? "").replace(/\D/g, "");
    if (!d) return null;
    return d.length === 10 || d.length === 11 ? `55${d}` : d;
  },
  z
    .string()
    .regex(/^55\d{10,11}$/, { error: "telefone_invalido" })
    .nullable(),
);

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "hora_invalida" });

const schemaNumero = z
  .object({
    rotulo: z.string().min(1, { error: "nome_obrigatorio" }).max(60, { error: "nome_longo" }),
    telefone,
    limite_por_hora: z.coerce
      .number({ error: "inteiro_invalido" })
      .int({ error: "inteiro_invalido" })
      .min(1)
      .max(200),
    limite_por_dia: z.coerce
      .number({ error: "inteiro_invalido" })
      .int({ error: "inteiro_invalido" })
      .min(1)
      .max(2000),
    intervalo_min_segundos: z.coerce
      .number({ error: "inteiro_invalido" })
      .int({ error: "inteiro_invalido" })
      .min(20)
      .max(3600),
    janela_inicio: hora,
    janela_fim: hora,
  })
  .refine((n) => n.janela_fim > n.janela_inicio, { error: "janela_invalida", path: ["janela_fim"] })
  .refine((n) => n.limite_por_dia >= n.limite_por_hora, {
    error: "limite_dia_menor",
    path: ["limite_por_dia"],
  });

function lerNumero(fd: FormData) {
  const t = (k: string, padrao = "") => String(fd.get(k) ?? padrao).trim();
  return {
    rotulo: t("rotulo"),
    telefone: t("telefone"),
    limite_por_hora: t("limite_por_hora", "20"),
    limite_por_dia: t("limite_por_dia", "120"),
    intervalo_min_segundos: t("intervalo_min_segundos", "90"),
    janela_inicio: t("janela_inicio", "08:00"),
    janela_fim: t("janela_fim", "22:00"),
  };
}

/** Cadastro do número com o aceite de risco da conexão não oficial (versão registrada). */
export async function criarNumero(fd: FormData): Promise<EstadoForm> {
  const u = await dono();
  if (!u) return { erros: { _form: "sem_permissao" } };
  if (fd.get("aceite") !== "on") return { erros: { aceite: "aceite_obrigatorio" } };
  const r = schemaNumero.safeParse(lerNumero(fd));
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("ofe_numeros")
    .insert({
      ...r.data,
      aceite_risco_em: new Date().toISOString(),
      aceite_risco_por: u.id,
      aceite_risco_versao: VERSAO_ACEITE,
    })
    .select("id")
    .single();
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath(ROTA);
  return {
    erros: {},
    ok: true,
    mensagem: "Número cadastrado. Agora conecte pelo QR Code.",
    id: data.id,
  };
}

export async function salvarNumero(id: string, fd: FormData): Promise<EstadoForm> {
  const u = await dono();
  if (!u) return { erros: { _form: "sem_permissao" } };
  const r = schemaNumero.safeParse(lerNumero(fd));
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { error } = await supabase.from("ofe_numeros").update(r.data).eq("id", id);
  if (error) return { erros: { _form: chaveDoErro(error) } };
  revalidatePath(ROTA);
  return { erros: {}, ok: true, mensagem: "Número atualizado." };
}

/** Renova o aceite quando o texto do risco mudou de versão. */
export async function renovarAceite(id: string): Promise<ResultadoAcao> {
  const u = await dono();
  if (!u) return { ok: false, erro: "sem_permissao" };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("ofe_numeros")
    .update({
      aceite_risco_em: new Date().toISOString(),
      aceite_risco_por: u.id,
      aceite_risco_versao: VERSAO_ACEITE,
    })
    .eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath(ROTA);
  return { ok: true, mensagem: "Aceite renovado." };
}

const MENSAGEM: Record<string, string> = {
  conectar: "Pedido enviado ao worker. O QR Code aparece em alguns segundos.",
  parear: "Pedido enviado ao worker. O código de pareamento aparece em alguns segundos.",
  desconectar: "Sessão sendo encerrada. O número fica cadastrado e pode ser conectado de novo.",
  remover: "Número removido. A sessão é encerrada no celular e apagada do banco.",
  sincronizar_grupos: "Sincronização pedida. Os grupos aparecem em Grupos em alguns segundos.",
  enviar_teste: "Teste pedido. A mensagem chega no grupo de teste em alguns segundos.",
};

/** Pede algo ao worker (o ERP nunca fala com o WhatsApp direto). */
export async function comandoNumero(
  id: string,
  tipo: string,
  grupoTeste?: string,
): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("ofertas");
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
  if (!(tipo in MENSAGEM)) return { ok: false, erro: "tipo_invalido" };
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("ofe_enviar_comando", {
    p_numero: id,
    p_tipo: tipo,
    p_payload: grupoTeste ? { grupo_id: grupoTeste } : {},
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath(ROTA);
  return { ok: true, mensagem: MENSAGEM[tipo] };
}

/** Leitura periódica da tela durante a conexão (QR e código só para o dono, pela RLS). */
export async function consultarConexao(id: string) {
  const u = await usuarioAtual();
  if (!u || !podeLer(u.papel, "ofertas") || !z.uuid().safeParse(id).success) return null;
  return estadoConexao(id);
}

export async function vincularGrupo(manual: string, sincronizado: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("ofertas");
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("ofe_vincular_grupo", {
    p_manual: manual,
    p_sincronizado: sincronizado,
  });
  if (error) return { ok: false, erro: chaveDoErro(error) };
  revalidatePath("/ofertas/grupos");
  return {
    ok: true,
    mensagem: "Grupos unidos: o cadastro manual passa a receber os dados do número.",
  };
}
