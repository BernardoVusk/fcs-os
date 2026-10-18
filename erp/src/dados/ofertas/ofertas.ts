import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import { lerPlataforma, type Plataforma } from "@/dominio/ofertas/plataformas";
import type { StatusEnvio, StatusPublicacao } from "@/dominio/ofertas/status";

export type Oferta = {
  id: string;
  plataforma: Plataforma;
  url_original: string;
  url_produto: string | null;
  chave_produto: string | null;
  anunciante_awin: number | null;
  titulo: string | null;
  imagem_caminho: string | null;
  imagem_url: string | null;
  preco_atual: number | null;
  preco_anterior: number | null;
  desconto: number | null;
  preco_pix: number | null;
  parcelamento: string | null;
  avaliacao: number | null;
  avaliacoes_qtd: number | null;
  loja: string | null;
  preco_variavel: boolean;
  fontes: Record<string, string>;
  dados_atualizados_em: string | null;
  link_colado: string | null;
  cupom_id: string | null;
  modelo_id: string | null;
  cta: string | null;
  campanha: string | null;
  status: string;
  criado_em: string;
  atualizado_em: string;
};

const COLUNAS =
  "id, plataforma, url_original, url_produto, chave_produto, anunciante_awin, titulo, imagem_caminho, imagem_url, preco_atual, preco_anterior, desconto, preco_pix, parcelamento, avaliacao, avaliacoes_qtd, loja, preco_variavel, fontes, dados_atualizados_em, link_colado, cupom_id, modelo_id, cta, campanha, status, criado_em, atualizado_em";

function ler(l: Record<string, unknown>): Oferta | null {
  const p = lerPlataforma(l.plataforma);
  return p
    ? ({ ...l, plataforma: p, fontes: (l.fontes ?? {}) as Record<string, string> } as Oferta)
    : null;
}

export async function obterOferta(id: string): Promise<Oferta | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase.from("ofe_ofertas").select(COLUNAS).eq("id", id).maybeSingle();
  return data ? ler(data) : null;
}

export async function listarOfertas(status?: string, limite = 100): Promise<Oferta[]> {
  const supabase = await clienteServidor();
  let q = supabase
    .from("ofe_ofertas")
    .select(COLUNAS)
    .order("atualizado_em", { ascending: false })
    .limit(limite);
  q = status ? q.eq("status", status) : q.neq("status", "arquivada");
  const { data } = await q;
  return (data ?? []).map(ler).filter((o): o is Oferta => !!o);
}

/** Ofertas do mesmo produto nos últimos dias, para avisar antes de repetir. */
export async function ofertasDoProduto(
  chave: string,
  dias = 7,
): Promise<{ id: string; titulo: string | null; criado_em: string }[]> {
  const supabase = await clienteServidor();
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
  const { data } = await supabase
    .from("ofe_ofertas")
    .select("id, titulo, criado_em")
    .eq("chave_produto", chave)
    .gte("criado_em", desde)
    .order("criado_em", { ascending: false })
    .limit(5);
  return data ?? [];
}

/** URL assinada (1 hora) da imagem enviada pelo usuário. */
export async function urlImagem(caminho: string | null): Promise<string | null> {
  if (!caminho) return null;
  const supabase = await clienteServidor();
  const { data } = await supabase.storage.from("ofertas-imagens").createSignedUrl(caminho, 3600);
  return data?.signedUrl ?? null;
}

export type EnvioPendente = {
  id: string;
  status: StatusEnvio;
  agendado_para: string;
  texto_final: string | null;
  link_url: string | null;
  link_origem: string | null;
  publicacao_id: string;
  grupo: { id: string; nome: string; link_convite: string | null };
  oferta: {
    id: string;
    titulo: string | null;
    plataforma: string;
    imagem_caminho: string | null;
    imagem_url: string | null;
  } | null;
  cupom: { id: string; codigo: string | null; plataforma: string; fim_em: string | null } | null;
  imagem: string | null;
  /** Horário já chegou (calculado no servidor, na hora da consulta). */
  devido: boolean;
};

/** Envios manuais esperando o usuário publicar (até `horasAdiante` à frente). */
export async function enviosManuaisPendentes(horasAdiante = 24): Promise<EnvioPendente[]> {
  const supabase = await clienteServidor();
  const ate = new Date(Date.now() + horasAdiante * 3_600_000).toISOString();
  const { data } = await supabase
    .from("ofe_envios")
    .select(
      "id, status, agendado_para, texto_final, link_url, link_origem, publicacao_id, grupo:ofe_grupos(id, nome, link_convite), publicacao:ofe_publicacoes(oferta:ofe_ofertas(id, titulo, plataforma, imagem_caminho, imagem_url), cupom:ofe_cupons(id, codigo, plataforma, fim_em))",
    )
    .eq("modo", "manual")
    .eq("status", "aguardando")
    .lte("agendado_para", ate)
    .order("agendado_para")
    .limit(200);
  const linhas = (data ?? []) as unknown as (Omit<EnvioPendente, "oferta" | "cupom" | "imagem"> & {
    publicacao: { oferta: EnvioPendente["oferta"]; cupom: EnvioPendente["cupom"] } | null;
  })[];
  const caminhos = [
    ...new Set(
      linhas.map((l) => l.publicacao?.oferta?.imagem_caminho).filter((c): c is string => !!c),
    ),
  ];
  const assinadas = new Map<string, string>();
  if (caminhos.length) {
    const { data: urls } = await supabase.storage
      .from("ofertas-imagens")
      .createSignedUrls(caminhos, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) assinadas.set(u.path, u.signedUrl);
  }
  const agora = Date.now();
  return linhas.map(({ publicacao, ...l }) => {
    const oferta = publicacao?.oferta ?? null;
    return {
      ...l,
      devido: Date.parse(l.agendado_para) <= agora,
      oferta,
      cupom: publicacao?.cupom ?? null,
      imagem: oferta?.imagem_caminho
        ? (assinadas.get(oferta.imagem_caminho) ?? null)
        : (oferta?.imagem_url ?? null),
    };
  });
}

export type PublicacaoResumo = {
  id: string;
  status: StatusPublicacao;
  modo: string;
  origem: string;
  agendado_para: string;
  total: number;
  enviados: number;
  falhas: number;
  incertos: number;
};

export async function publicacoesDaOferta(ofertaId: string): Promise<PublicacaoResumo[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("ofe_publicacoes_status")
    .select("id, status, modo, origem, agendado_para, total, enviados, falhas, incertos")
    .eq("oferta_id", ofertaId)
    .order("agendado_para", { ascending: false })
    .limit(50);
  return (data ?? []) as PublicacaoResumo[];
}
