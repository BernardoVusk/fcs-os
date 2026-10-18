"use server";

import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Upload direto do navegador para o Storage por URL assinada. A server action só assina
 * (checando papel, tamanho e tipo) e depois registra os metadados; o arquivo em si não passa
 * pelo servidor, o que mantém o limite de 4,5 MB da Vercel longe de STL e 3MF de 100 MB.
 */
export type EnvioAssinado =
  { ok: true; url: string; caminho: string; bucket: string } | { ok: false; erro: string };

const LIMITE_ARQUIVO_PRODUTO = 100 * 1024 * 1024;
const LIMITE_ANEXO = 10 * 1024 * 1024;
const TIPOS_ANEXO = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
];
const TIPOS_FOTO = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const EXTENSOES: Record<string, RegExp> = {
  stl: /\.stl$/i,
  "3mf": /\.3mf$/i,
  gcode: /\.(gcode|gco|g)$/i,
  imagem: /\.(png|jpe?g|webp|gif)$/i,
  documento: /\.(pdf|txt|md|csv|xlsx|docx)$/i,
};

function nomeSeguro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Arquivo de produto: STL, 3MF e G-code vão para o bucket privado; foto vai para o público. */
export async function assinarEnvioProduto(entrada: {
  produtoId: string;
  tipo: string;
  nomeArquivo: string;
  tamanho: number;
  mime: string;
}): Promise<EnvioAssinado> {
  try {
    await exigirEscrita("catalogo");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const r = z
    .object({
      produtoId: z.uuid(),
      tipo: z.enum(["stl", "3mf", "gcode", "imagem", "documento"]),
      nomeArquivo: z.string().min(1).max(255),
      tamanho: z.number().int().positive(),
      mime: z.string().max(120),
    })
    .safeParse(entrada);
  if (!r.success) return { ok: false, erro: "tipo_invalido" };
  const d = r.data;
  if (d.tamanho > LIMITE_ARQUIVO_PRODUTO) return { ok: false, erro: "arquivo_grande" };
  if (!EXTENSOES[d.tipo].test(d.nomeArquivo)) return { ok: false, erro: "arquivo_tipo" };
  if (d.tipo === "imagem" && !TIPOS_FOTO.includes(d.mime))
    return { ok: false, erro: "arquivo_tipo" };
  const bucket = d.tipo === "imagem" ? "fotos-produto" : "arquivos-produto";
  const caminho = `${d.produtoId}/${Date.now()}-${nomeSeguro(d.nomeArquivo) || "arquivo"}`;
  const supabase = await clienteServidor();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(caminho);
  if (error || !data) return { ok: false, erro: "erro_inesperado" };
  return { ok: true, url: data.signedUrl, caminho: data.path, bucket };
}

/** Anexo da base de conhecimento: até 10 MB, só imagem, PDF, texto e markdown. */
export async function assinarEnvioAnexo(entrada: {
  conhecimentoId: string;
  nomeArquivo: string;
  tamanho: number;
  mime: string;
}): Promise<EnvioAssinado> {
  try {
    await exigirEscrita("conhecimento");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const r = z
    .object({
      conhecimentoId: z.uuid(),
      nomeArquivo: z.string().min(1).max(255),
      tamanho: z.number().int().positive(),
      mime: z.string().max(120),
    })
    .safeParse(entrada);
  if (!r.success) return { ok: false, erro: "tipo_invalido" };
  const d = r.data;
  if (d.tamanho > LIMITE_ANEXO) return { ok: false, erro: "arquivo_grande" };
  if (!TIPOS_ANEXO.includes(d.mime)) return { ok: false, erro: "arquivo_tipo" };
  const caminho = `${d.conhecimentoId}/${Date.now()}-${nomeSeguro(d.nomeArquivo) || "anexo"}`;
  const supabase = await clienteServidor();
  const { data, error } = await supabase.storage
    .from("anexos-conhecimento")
    .createSignedUploadUrl(caminho);
  if (error || !data) return { ok: false, erro: "erro_inesperado" };
  return { ok: true, url: data.signedUrl, caminho: data.path, bucket: "anexos-conhecimento" };
}

const TIPOS_IMAGEM_OFERTA = ["image/png", "image/jpeg", "image/webp"];
const LIMITE_IMAGEM_OFERTA = 5 * 1024 * 1024;

/** Imagem de oferta enviada pelo usuário (substitui a da API): bucket privado, até 5 MB. */
export async function assinarEnvioImagemOferta(entrada: {
  nomeArquivo: string;
  tamanho: number;
  mime: string;
}): Promise<EnvioAssinado> {
  try {
    await exigirEscrita("ofertas");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  const r = z
    .object({
      nomeArquivo: z.string().min(1).max(255),
      tamanho: z.number().int().positive(),
      mime: z.string().max(120),
    })
    .safeParse(entrada);
  if (!r.success) return { ok: false, erro: "tipo_invalido" };
  const d = r.data;
  if (d.tamanho > LIMITE_IMAGEM_OFERTA) return { ok: false, erro: "imagem_grande" };
  if (!TIPOS_IMAGEM_OFERTA.includes(d.mime) || !EXTENSOES.imagem.test(d.nomeArquivo))
    return { ok: false, erro: "arquivo_tipo" };
  const mes = new Date().toISOString().slice(0, 7);
  const caminho = `${mes}/${Date.now()}-${nomeSeguro(d.nomeArquivo) || "imagem"}`;
  const supabase = await clienteServidor();
  const { data, error } = await supabase.storage
    .from("ofertas-imagens")
    .createSignedUploadUrl(caminho);
  if (error || !data) return { ok: false, erro: "erro_inesperado" };
  return { ok: true, url: data.signedUrl, caminho: data.path, bucket: "ofertas-imagens" };
}
