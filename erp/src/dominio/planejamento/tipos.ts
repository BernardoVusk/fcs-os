/** Listas, rótulos e leitura dos jsonb do planejamento (spec 5.8). Puro: sem React, Next ou Supabase. */

export const TIPOS_ITEM = ["tarefa", "conteudo", "projeto"] as const;
export type TipoItem = (typeof TIPOS_ITEM)[number];
export const TIPO_ITEM_ROTULO: Record<TipoItem, string> = {
  tarefa: "Tarefa",
  conteudo: "Conteúdo",
  projeto: "Projeto",
};

export const PRIORIDADES = ["alta", "media", "baixa"] as const;
export type Prioridade = (typeof PRIORIDADES)[number];
export const PRIORIDADE_ROTULO: Record<Prioridade, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const CANAIS_PUBLICACAO = [
  "instagram",
  "tiktok",
  "shopee",
  "mercado_livre",
  "youtube",
  "site",
  "whatsapp",
  "interno",
] as const;
export type CanalPublicacao = (typeof CANAIS_PUBLICACAO)[number];
export const CANAL_PUBLICACAO_ROTULO: Record<CanalPublicacao, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  shopee: "Shopee",
  mercado_livre: "Mercado Livre",
  youtube: "YouTube",
  site: "Site",
  whatsapp: "WhatsApp",
  interno: "Interno",
};

export const FORMATOS = [
  "carrossel",
  "reel",
  "post",
  "stories",
  "video",
  "foto_produto",
  "descricao_anuncio",
  "campanha_ads",
  "outro",
] as const;
export type Formato = (typeof FORMATOS)[number];
export const FORMATO_ROTULO: Record<Formato, string> = {
  carrossel: "Carrossel",
  reel: "Reel",
  post: "Post",
  stories: "Stories",
  video: "Vídeo",
  foto_produto: "Foto de produto",
  descricao_anuncio: "Descrição de anúncio",
  campanha_ads: "Campanha de anúncios",
  outro: "Outro",
};

/** Checklist que nasce com o item quando não vem de modelo (editável depois). */
export const CHECKLIST_PADRAO: Record<Formato, readonly string[]> = {
  carrossel: [
    "Pauta",
    "Texto",
    "Visual",
    "Render PNG",
    "Legenda",
    "Publicação",
    "Registrar métricas",
  ],
  reel: ["Roteiro", "Gravação", "Edição", "Capa", "Legenda", "Publicação", "Registrar métricas"],
  post: ["Texto", "Visual", "Legenda", "Publicação", "Registrar métricas"],
  stories: ["Roteiro", "Montar", "Publicação"],
  video: ["Roteiro", "Gravação", "Edição", "Publicação", "Registrar métricas"],
  foto_produto: ["Preparar a peça", "Fotografar", "Tratar", "Subir no anúncio"],
  descricao_anuncio: ["Levantar a ficha", "Escrever", "Revisar", "Publicar no canal"],
  campanha_ads: ["Briefing", "Criativos", "Subir a campanha", "Acompanhar", "Relatório"],
  outro: ["Fazer"],
};

/** Skill do workspace que produz cada formato (null = sem skill). */
export const SKILL_PADRAO: Record<Formato, string | null> = {
  carrossel: "/carrossel",
  post: "/carrossel",
  reel: null,
  stories: null,
  video: null,
  foto_produto: null,
  descricao_anuncio: null,
  campanha_ads: "/anuncio-google",
  outro: null,
};

/** Canal mais provável por formato (pré-preenche o formulário). */
export const CANAL_PADRAO: Record<Formato, CanalPublicacao> = {
  carrossel: "instagram",
  reel: "instagram",
  post: "instagram",
  stories: "instagram",
  video: "tiktok",
  foto_produto: "shopee",
  descricao_anuncio: "shopee",
  campanha_ads: "shopee",
  outro: "interno",
};

export const CHAVES_METRICA = [
  "alcance",
  "visualizacoes",
  "curtidas",
  "comentarios",
  "salvos",
  "compartilhamentos",
  "cliques",
  "vendas",
] as const;
export type ChaveMetrica = (typeof CHAVES_METRICA)[number];
export const METRICA_ROTULO: Record<ChaveMetrica, string> = {
  alcance: "Alcance",
  visualizacoes: "Visualizações",
  curtidas: "Curtidas",
  comentarios: "Comentários",
  salvos: "Salvos",
  compartilhamentos: "Compartilhamentos",
  cliques: "Cliques",
  vendas: "Vendas atribuídas",
};

export type ItemChecklist = { nome: string; feito: boolean };
export type Ligacao = { rotulo: string; url: string };
export type Metricas = Partial<Record<ChaveMetrica, number>>;

export function tipoValido(v: unknown): v is TipoItem {
  return typeof v === "string" && (TIPOS_ITEM as readonly string[]).includes(v);
}
export function prioridadeValida(v: unknown): v is Prioridade {
  return typeof v === "string" && (PRIORIDADES as readonly string[]).includes(v);
}
export function formatoValido(v: unknown): v is Formato {
  return typeof v === "string" && (FORMATOS as readonly string[]).includes(v);
}
export function canalValido(v: unknown): v is CanalPublicacao {
  return typeof v === "string" && (CANAIS_PUBLICACAO as readonly string[]).includes(v);
}

/** Checklist lido do jsonb: ignora o que não tem a forma {nome, feito}; nome sem espaços nas pontas. */
export function lerChecklist(valor: unknown): ItemChecklist[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((e) => {
    const nome = (e as { nome?: unknown })?.nome;
    const feito = (e as { feito?: unknown })?.feito;
    return typeof nome === "string" && nome.trim()
      ? [{ nome: nome.trim().slice(0, 120), feito: feito === true }]
      : [];
  });
}

/** Checklist inicial: do modelo (nomes) ou do padrão do formato; sem formato, vazio. */
export function checklistInicial(
  formato: Formato | null | undefined,
  nomesDoModelo?: readonly string[],
): ItemChecklist[] {
  const nomes =
    nomesDoModelo && nomesDoModelo.length > 0
      ? nomesDoModelo
      : formato
        ? CHECKLIST_PADRAO[formato]
        : [];
  return nomes.map((nome) => ({ nome, feito: false }));
}

/** Linhas de texto viram checklist (uma por linha, vazias fora). */
export function checklistDeTexto(texto: string): ItemChecklist[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((nome) => ({ nome: nome.slice(0, 120), feito: false }));
}

/** 0 a 100; sem itens = 0. */
export function progressoChecklist(itens: readonly ItemChecklist[]): number {
  if (itens.length === 0) return 0;
  return Math.round((itens.filter((i) => i.feito).length / itens.length) * 100);
}

export function alternarChecklist(
  itens: readonly ItemChecklist[],
  indice: number,
): ItemChecklist[] {
  return itens.map((i, n) => (n === indice ? { ...i, feito: !i.feito } : i));
}

/** Ligações lidas do jsonb: só {rotulo, url} com url http(s). */
export function lerLigacoes(valor: unknown): Ligacao[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((e) => {
    const r = e as { rotulo?: unknown; url?: unknown };
    const url = typeof r?.url === "string" ? r.url.trim() : "";
    if (!/^https?:\/\//i.test(url)) return [];
    const rotulo = typeof r.rotulo === "string" && r.rotulo.trim() ? r.rotulo.trim() : url;
    return [{ rotulo: rotulo.slice(0, 120), url: url.slice(0, 500) }];
  });
}

/** Uma ligação por linha: "rótulo | url" ou só a url. */
export function ligacoesDeTexto(texto: string): Ligacao[] {
  return lerLigacoes(
    texto
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((l) => {
        const [a, b] = l.split("|").map((p) => p.trim());
        return b ? { rotulo: a, url: b } : { rotulo: "", url: a };
      }),
  );
}

/** Métricas lidas do jsonb: só chaves conhecidas, números finitos não negativos. */
export function lerMetricas(valor: unknown): Metricas {
  const saida: Metricas = {};
  if (!valor || typeof valor !== "object") return saida;
  for (const chave of CHAVES_METRICA) {
    const v = (valor as Record<string, unknown>)[chave];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) saida[chave] = v;
  }
  return saida;
}

export function lerTags(valor: unknown): string[] {
  const lista = Array.isArray(valor) ? valor : typeof valor === "string" ? valor.split(",") : [];
  const vistas = new Set<string>();
  for (const t of lista) {
    if (typeof t !== "string") continue;
    const limpa = t.trim().toLowerCase().slice(0, 40);
    if (limpa) vistas.add(limpa);
  }
  return [...vistas].slice(0, 20);
}

export type CamposModelo = {
  titulo?: string;
  prioridade?: Prioridade;
  canal_publicacao?: CanalPublicacao;
  formato?: Formato;
  briefing?: string;
  cta?: string;
  legenda?: string;
  tags?: string[];
  responsavel?: string;
};

/** Campos padrão do modelo lidos do jsonb, só os válidos. */
export function lerCamposModelo(valor: unknown): CamposModelo {
  const saida: CamposModelo = {};
  if (!valor || typeof valor !== "object") return saida;
  const r = valor as Record<string, unknown>;
  const texto = (k: keyof CamposModelo, max: number) => {
    const v = r[k];
    if (typeof v === "string" && v.trim())
      (saida as Record<string, unknown>)[k] = v.trim().slice(0, max);
  };
  texto("titulo", 160);
  texto("briefing", 4000);
  texto("cta", 300);
  texto("legenda", 3000);
  texto("responsavel", 80);
  if (prioridadeValida(r.prioridade)) saida.prioridade = r.prioridade;
  if (canalValido(r.canal_publicacao)) saida.canal_publicacao = r.canal_publicacao;
  if (formatoValido(r.formato)) saida.formato = r.formato;
  const tags = lerTags(r.tags);
  if (tags.length) saida.tags = tags;
  return saida;
}

/** Duplicar: copia o conteúdo, zera datas, status, checklist, métricas e carimbos. */
export function camposParaDuplicar<
  T extends {
    titulo: string;
    checklist: unknown;
    metricas?: unknown;
    status?: unknown;
    inicio?: unknown;
    prazo?: unknown;
    concluido_em?: unknown;
    publicado_em?: unknown;
    id?: unknown;
    criado_em?: unknown;
    atualizado_em?: unknown;
    criado_por?: unknown;
    recorrencia_id?: unknown;
  },
>(
  item: T,
): Omit<
  T,
  | "id"
  | "criado_em"
  | "atualizado_em"
  | "criado_por"
  | "status"
  | "inicio"
  | "prazo"
  | "concluido_em"
  | "publicado_em"
  | "metricas"
  | "recorrencia_id"
> & { titulo: string; checklist: ItemChecklist[]; origem: "duplicado" } {
  const {
    id: _id,
    criado_em: _c,
    atualizado_em: _a,
    criado_por: _p,
    status: _s,
    inicio: _i,
    prazo: _z,
    concluido_em: _ce,
    publicado_em: _pe,
    metricas: _m,
    recorrencia_id: _r,
    ...resto
  } = item;
  void _id;
  void _c;
  void _a;
  void _p;
  void _s;
  void _i;
  void _z;
  void _ce;
  void _pe;
  void _m;
  void _r;
  return {
    ...resto,
    titulo: `${item.titulo} (cópia)`.slice(0, 160),
    checklist: lerChecklist(item.checklist).map((c) => ({ ...c, feito: false })),
    origem: "duplicado",
  };
}
