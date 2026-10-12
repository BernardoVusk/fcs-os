"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  errosDoZod,
  lerCampos,
  textoOpcional,
  type EstadoForm,
  type ResultadoAcao,
} from "@/lib/forms";
import { contemSegredo } from "@/dominio/conhecimento/segredos";
import {
  CONFIDENCIALIDADES,
  lerTags,
  TIPOS_CONHECIMENTO,
  TIPOS_RELACAO,
  type EstruturaDecisao,
} from "@/dominio/conhecimento/tipos";
import {
  atualizarConhecimento,
  criarConhecimento,
  type DadosConhecimento,
} from "@/dados/conhecimento-escrita";

const schema = z.object({
  titulo: z.string().min(3, { error: "titulo_curto" }).max(160, { error: "nome_longo" }),
  tipo: z.enum(TIPOS_CONHECIMENTO, { error: "tipo_invalido" }),
  categoria_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
  resumo: textoOpcional(400),
  conteudo: z
    .string()
    .min(1, { error: "conteudo_obrigatorio" })
    .max(60000, { error: "conteudo_longo" }),
  tags: z.string().max(1000),
  modulo: textoOpcional(60),
  projeto: textoOpcional(80),
  referencia: textoOpcional(500),
  confidencialidade: z.enum(CONFIDENCIALIDADES),
  status: z.enum(["rascunho", "ativo"]),
  motivo: textoOpcional(300),
  contexto: textoOpcional(4000),
  alternativas: textoOpcional(4000),
  decisao: textoOpcional(4000),
  consequencias: textoOpcional(4000),
});

const CAMPOS = [
  "id",
  "titulo",
  "tipo",
  "categoria_id",
  "resumo",
  "conteudo",
  "tags",
  "modulo",
  "projeto",
  "referencia",
  "confidencialidade",
  "status",
  "motivo",
  "contexto",
  "alternativas",
  "decisao",
  "consequencias",
] as const;

export async function salvarConhecimento(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("conhecimento");
  const campos = lerCampos(fd, CAMPOS);
  const r = schema.safeParse(campos);
  if (!r.success) return errosDoZod(r.error);
  for (const [campo, texto] of [
    ["conteudo", r.data.conteudo],
    ["resumo", r.data.resumo],
    ["titulo", r.data.titulo],
  ] as const) {
    if (contemSegredo(texto).achou) return { erros: { [campo]: "contem_segredo" } };
  }
  const estrutura: EstruturaDecisao | null =
    r.data.tipo === "decisao"
      ? {
          contexto: r.data.contexto ?? "",
          alternativas: (r.data.alternativas ?? "")
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
          decisao: r.data.decisao ?? "",
          consequencias: r.data.consequencias ?? "",
        }
      : null;
  const dados: DadosConhecimento = {
    titulo: r.data.titulo,
    resumo: r.data.resumo,
    conteudo: r.data.conteudo,
    tipo: r.data.tipo,
    categoria_id: r.data.categoria_id,
    tags: lerTags(r.data.tags),
    modulo: r.data.modulo,
    projeto: r.data.projeto,
    referencia: r.data.referencia,
    confidencialidade: r.data.confidencialidade,
    estrutura,
    status: r.data.status,
  };
  const supabase = await clienteServidor();
  const resultado = campos.id
    ? await atualizarConhecimento(supabase, campos.id, dados, r.data.motivo)
    : await criarConhecimento(supabase, dados, "manual");
  if (!resultado.ok) return { erros: { _form: resultado.erro } };
  revalidatePath("/conhecimento", "layout");
  revalidatePath("/");
  redirect(`/conhecimento/${resultado.id}`);
}

async function permitido(): Promise<ResultadoAcao | null> {
  try {
    await exigirEscrita("conhecimento");
    return null;
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
}

export async function alternarValidado(id: string): Promise<ResultadoAcao> {
  const bloqueio = await permitido();
  if (bloqueio) return bloqueio;
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { data: user } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("conhecimentos")
    .select("validado")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { ok: false, erro: "nao_encontrado" };
  const validar = !data.validado;
  const { error } = await supabase
    .from("conhecimentos")
    .update({
      validado: validar,
      validado_por: validar ? (user.user?.id ?? null) : null,
      validado_em: validar ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, erro: "erro_inesperado" };
  revalidatePath(`/conhecimento/${id}`);
  revalidatePath("/conhecimento");
  return { ok: true, mensagem: validar ? "Marcado como validado." : "Validação removida." };
}

export async function alterarStatusConhecimento(
  id: string,
  status: "rascunho" | "ativo" | "arquivado",
): Promise<ResultadoAcao> {
  const bloqueio = await permitido();
  if (bloqueio) return bloqueio;
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { error } = await supabase.from("conhecimentos").update({ status }).eq("id", id);
  if (error) return { ok: false, erro: "erro_inesperado" };
  revalidatePath("/conhecimento", "layout");
  return {
    ok: true,
    mensagem:
      status === "arquivado"
        ? "Arquivado."
        : status === "ativo"
          ? "Reativado."
          : "Voltou a rascunho.",
  };
}

export async function relacionar(
  deId: string,
  paraId: string,
  tipo: string,
): Promise<ResultadoAcao> {
  const bloqueio = await permitido();
  if (bloqueio) return bloqueio;
  const r = z
    .object({ deId: z.uuid(), paraId: z.uuid(), tipo: z.enum(TIPOS_RELACAO) })
    .safeParse({ deId, paraId, tipo });
  if (!r.success) return { ok: false, erro: "nao_encontrado" };
  if (deId === paraId) return { ok: false, erro: "mesmo_registro" };
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("conhecimentos_relacoes")
    .insert({ de_id: deId, para_id: paraId, tipo });
  if (error)
    return { ok: false, erro: error.code === "23505" ? "relacao_repetida" : "erro_inesperado" };
  revalidatePath(`/conhecimento/${deId}`);
  revalidatePath(`/conhecimento/${paraId}`);
  return { ok: true, mensagem: "Relação criada." };
}

export async function removerRelacao(deId: string, paraId: string): Promise<ResultadoAcao> {
  const bloqueio = await permitido();
  if (bloqueio) return bloqueio;
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("conhecimentos_relacoes")
    .delete()
    .eq("de_id", deId)
    .eq("para_id", paraId);
  if (error) return { ok: false, erro: "erro_inesperado" };
  revalidatePath(`/conhecimento/${deId}`);
  revalidatePath(`/conhecimento/${paraId}`);
  return { ok: true, mensagem: "Relação removida." };
}

const TIPOS_ANEXO = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
];

export async function enviarAnexo(id: string, fd: FormData): Promise<ResultadoAcao> {
  const bloqueio = await permitido();
  if (bloqueio) return bloqueio;
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0)
    return { ok: false, erro: "arquivo_obrigatorio" };
  if (arquivo.size > 10 * 1024 * 1024) return { ok: false, erro: "arquivo_grande" };
  if (!TIPOS_ANEXO.includes(arquivo.type)) return { ok: false, erro: "arquivo_tipo" };
  const nomeSeguro = arquivo.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .slice(0, 120);
  const caminho = `${id}/${Date.now()}-${nomeSeguro}`;
  const supabase = await clienteServidor();
  const { error: erroUpload } = await supabase.storage
    .from("anexos-conhecimento")
    .upload(caminho, arquivo, { contentType: arquivo.type });
  if (erroUpload) return { ok: false, erro: "erro_inesperado" };
  const { error } = await supabase
    .from("conhecimentos_anexos")
    .insert({
      conhecimento_id: id,
      storage_path: caminho,
      nome: arquivo.name.slice(0, 200),
      tamanho: arquivo.size,
      tipo: arquivo.type,
    });
  if (error) {
    await supabase.storage.from("anexos-conhecimento").remove([caminho]);
    return { ok: false, erro: "erro_inesperado" };
  }
  revalidatePath(`/conhecimento/${id}`);
  return { ok: true, mensagem: "Anexo enviado." };
}

export async function removerAnexo(anexoId: string): Promise<ResultadoAcao> {
  const bloqueio = await permitido();
  if (bloqueio) return bloqueio;
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("conhecimentos_anexos")
    .select("id, conhecimento_id, storage_path")
    .eq("id", anexoId)
    .maybeSingle();
  if (!data) return { ok: false, erro: "nao_encontrado" };
  await supabase.storage.from("anexos-conhecimento").remove([data.storage_path]);
  const { error } = await supabase.from("conhecimentos_anexos").delete().eq("id", anexoId);
  if (error) return { ok: false, erro: "erro_inesperado" };
  revalidatePath(`/conhecimento/${data.conhecimento_id}`);
  return { ok: true, mensagem: "Anexo removido." };
}

export async function urlAnexo(anexoId: string): Promise<{ ok: boolean; url?: string }> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("conhecimentos_anexos")
    .select("storage_path")
    .eq("id", anexoId)
    .maybeSingle();
  if (!data) return { ok: false };
  const { data: assinada } = await supabase.storage
    .from("anexos-conhecimento")
    .createSignedUrl(data.storage_path, 600);
  return assinada ? { ok: true, url: assinada.signedUrl } : { ok: false };
}
