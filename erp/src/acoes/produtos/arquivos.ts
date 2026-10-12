"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita, exigirLeitura } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  errosDoZod,
  lerCampos,
  textoOpcional,
  type EstadoForm,
  type ResultadoAcao,
} from "@/lib/forms";
import { chaveDoErro } from "@/lib/erros-pt";
import { objetoExiste } from "@/dados/storage";

const TIPOS = ["stl", "3mf", "gcode", "imagem", "documento"] as const;
const LIMITE_BYTES = 100 * 1024 * 1024;

const schema = z.object({
  produto_id: z.uuid(),
  variacao_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
  tipo: z.enum(TIPOS, { error: "tipo_invalido" }),
  nome: z.string().max(200, { error: "nome_longo" }),
  caminho_externo: textoOpcional(500),
  hash_sha256: z.preprocess(
    (v) => (v === "" ? null : String(v).toLowerCase()),
    z
      .string()
      .regex(/^[0-9a-f]{64}$/, { error: "hash_invalido" })
      .nullable(),
  ),
  licenca: textoOpcional(200),
  notas: textoOpcional(1000),
});

/** Registra um arquivo já enviado ao bucket (imagem: fotos-produto público; demais: arquivos-produto privado) ou um caminho externo com hash. */
export async function salvarArquivo(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("catalogo");
  const c = lerCampos(fd, [
    "produto_id",
    "variacao_id",
    "tipo",
    "nome",
    "caminho_externo",
    "hash_sha256",
    "licenca",
    "notas",
    "storage_path",
    "bucket",
    "tamanho",
  ] as const);
  const r = schema.safeParse(c);
  if (!r.success) return errosDoZod(r.error);
  // O arquivo já subiu direto do navegador para o Storage (acoes/upload.ts); aqui chegam só os metadados.
  const caminho = c.storage_path.trim();
  const bucketInformado = c.bucket.trim();
  const temArquivo = caminho.length > 0;
  if (!temArquivo && !r.data.caminho_externo) return { erros: { arquivo: "arquivo_sem_origem" } };
  const supabase = await clienteServidor();
  let bucket: "arquivos-produto" | "fotos-produto" | null = null;
  let storagePath: string | null = null;
  const hash = r.data.hash_sha256;
  let tamanho: number | null = null;
  let nome = r.data.nome.trim();
  if (temArquivo) {
    bucket = r.data.tipo === "imagem" ? "fotos-produto" : "arquivos-produto";
    if (
      bucketInformado !== bucket ||
      !caminho.startsWith(`${r.data.produto_id}/`) ||
      caminho.includes("..")
    )
      return { erros: { arquivo: "arquivo_sem_origem" } };
    if (!(await objetoExiste(bucket, caminho))) return { erros: { arquivo: "arquivo_sem_origem" } };
    storagePath = caminho;
    tamanho = Number(c.tamanho) > 0 ? Math.round(Number(c.tamanho)) : null;
    if (tamanho && tamanho > LIMITE_BYTES) return { erros: { arquivo: "arquivo_grande" } };
    if (!nome)
      nome = caminho.slice(caminho.indexOf("-", caminho.lastIndexOf("/")) + 1) || "arquivo";
  }
  if (!nome) return { erros: { nome: "nome_obrigatorio" } };
  const { data: anterior } = await supabase
    .from("produtos_arquivos")
    .select("versao")
    .eq("produto_id", r.data.produto_id)
    .eq("nome", nome)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("produtos_arquivos").insert({
    produto_id: r.data.produto_id,
    variacao_id: r.data.variacao_id,
    tipo: r.data.tipo,
    nome,
    bucket,
    storage_path: storagePath,
    caminho_externo: temArquivo ? null : r.data.caminho_externo,
    hash_sha256: hash,
    tamanho,
    versao: (anterior?.versao ?? 0) + 1,
    licenca: r.data.licenca,
    notas: r.data.notas,
  });
  if (error) {
    if (bucket && storagePath) await supabase.storage.from(bucket).remove([storagePath]);
    return { erros: { _form: chaveDoErro(error) } };
  }
  revalidatePath(`/catalogo/produtos/${r.data.produto_id}`);
  return { erros: {}, ok: true, mensagem: temArquivo ? "Arquivo enviado." : "Caminho registrado." };
}

export async function removerArquivo(id: string, produtoId: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("catalogo");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("produtos_arquivos")
    .select("bucket, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { ok: false, erro: "nao_encontrado" };
  const { error } = await supabase.from("produtos_arquivos").delete().eq("id", id);
  if (error) return { ok: false, erro: chaveDoErro(error) };
  if (data.bucket && data.storage_path)
    await supabase.storage.from(data.bucket).remove([data.storage_path]);
  revalidatePath(`/catalogo/produtos/${produtoId}`);
  return { ok: true, mensagem: "Arquivo removido." };
}

/** URL assinada por 10 minutos para arquivos privados; fotos públicas devolvem a URL direta. */
export async function urlDoArquivo(
  id: string,
): Promise<{ ok: true; url: string } | { ok: false; erro: string }> {
  try {
    await exigirLeitura("catalogo");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("produtos_arquivos")
    .select("bucket, storage_path, caminho_externo")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { ok: false, erro: "nao_encontrado" };
  if (!data.bucket || !data.storage_path) return { ok: false, erro: "arquivo_sem_origem" };
  if (data.bucket === "fotos-produto")
    return {
      ok: true,
      url: supabase.storage.from(data.bucket).getPublicUrl(data.storage_path).data.publicUrl,
    };
  const { data: assinada, error } = await supabase.storage
    .from(data.bucket)
    .createSignedUrl(data.storage_path, 600);
  if (error || !assinada) return { ok: false, erro: "erro_inesperado" };
  return { ok: true, url: assinada.signedUrl };
}
