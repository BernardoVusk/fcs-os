-- 0012: produtos, variações, lista de materiais, preços por canal com vigência, anúncios por canal,
-- arquivos (buckets) e manutenções de impressora. Nada é inventado: peso, tempo e custo nascem nulos.

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 160),
  sku text unique check (sku ~ '^[A-Za-z0-9._-]{1,40}$'),
  descricao text,
  categoria_id uuid references public.categorias (id),
  status text not null default 'rascunho' check (status in ('rascunho', 'ativo', 'pausado', 'descontinuado')),
  dimensoes jsonb not null default '{}'::jsonb,
  peso_g numeric(10,3) check (peso_g >= 0),
  tempo_impressao_min numeric(10,1) check (tempo_impressao_min >= 0),
  pecas_por_ciclo integer not null default 1 check (pecas_por_ciclo >= 1),
  taxa_falha_pct numeric(7,6) check (taxa_falha_pct >= 0 and taxa_falha_pct < 1),
  tempo_preparo_min numeric(10,1) check (tempo_preparo_min >= 0),
  tempo_acabamento_min numeric(10,1) check (tempo_acabamento_min >= 0),
  tempo_embalagem_min numeric(10,1) check (tempo_embalagem_min >= 0),
  insumo_impressao_id uuid references public.insumos (id),
  impressora_padrao_id uuid references public.impressoras (id),
  margem_alvo numeric(7,6) check (margem_alvo >= 0 and margem_alvo < 1),
  observacoes_fabricacao text,
  licenca text,
  licenca_comercial boolean not null default false,
  atributos jsonb not null default '{}'::jsonb,
  custo_atual numeric(14,4),
  custo_variavel_atual numeric(14,4),
  calculo_atual_id uuid references public.calculos_custo (id),
  custo_atualizado_em timestamptz,
  origem text not null default 'manual' check (origem in ('manual', 'importacao')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index produtos_busca on public.produtos using gin (app.normalizar(nome) extensions.gin_trgm_ops);
create index produtos_status on public.produtos (status);
create index produtos_insumo on public.produtos (insumo_impressao_id);
create trigger produtos_atualizado before update on public.produtos for each row execute function app.carimbar_atualizacao();
create trigger produtos_auditoria after insert or update or delete on public.produtos for each row execute function app.auditar();

create table public.produtos_variacoes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  sku text unique check (sku ~ '^[A-Za-z0-9._-]{1,40}$'),
  atributos jsonb not null default '{}'::jsonb,
  peso_g numeric(10,3) check (peso_g >= 0),
  tempo_impressao_min numeric(10,1) check (tempo_impressao_min >= 0),
  pecas_por_ciclo integer check (pecas_por_ciclo >= 1),
  taxa_falha_pct numeric(7,6) check (taxa_falha_pct >= 0 and taxa_falha_pct < 1),
  tempo_preparo_min numeric(10,1) check (tempo_preparo_min >= 0),
  tempo_acabamento_min numeric(10,1) check (tempo_acabamento_min >= 0),
  tempo_embalagem_min numeric(10,1) check (tempo_embalagem_min >= 0),
  insumo_impressao_id uuid references public.insumos (id),
  impressora_padrao_id uuid references public.impressoras (id),
  ativo boolean not null default true,
  custo_atual numeric(14,4),
  custo_variavel_atual numeric(14,4),
  calculo_atual_id uuid references public.calculos_custo (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (produto_id, nome)
);
create trigger variacoes_atualizado before update on public.produtos_variacoes for each row execute function app.carimbar_atualizacao();
create trigger variacoes_auditoria after insert or update or delete on public.produtos_variacoes for each row execute function app.auditar();

-- BOM: material de impressão vem da ficha; aqui ficam complementares, embalagem e acabamento (e a referência do filamento).
create table public.produtos_materiais (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  variacao_id uuid references public.produtos_variacoes (id) on delete cascade,
  insumo_id uuid not null references public.insumos (id),
  quantidade numeric(14,3) not null check (quantidade > 0),
  unidade text not null references public.unidades (codigo),
  papel text not null default 'complementar' check (papel in ('impressao', 'complementar', 'embalagem', 'acabamento')),
  por text not null default 'peca' check (por in ('peca', 'pedido')),
  observacoes text,
  criado_em timestamptz not null default now()
);
create unique index produtos_materiais_unico on public.produtos_materiais (produto_id, coalesce(variacao_id, '00000000-0000-0000-0000-000000000000'::uuid), insumo_id, papel);
create index produtos_materiais_insumo on public.produtos_materiais (insumo_id);

create table public.produtos_precos_canal (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  variacao_id uuid references public.produtos_variacoes (id) on delete cascade,
  canal_id uuid not null references public.canais_venda (id),
  preco_venda numeric(14,2) not null check (preco_venda >= 0),
  vigente_desde date not null default current_date,
  vigente_ate date,
  margem_estimada_cache numeric(7,6),
  calculo_custo_id uuid references public.calculos_custo (id),
  origem text not null default 'manual' check (origem in ('manual', 'importacao')),
  observacoes text,
  criado_em timestamptz not null default now(),
  check (vigente_ate is null or vigente_ate >= vigente_desde)
);
create index precos_canal_vigencia on public.produtos_precos_canal (produto_id, canal_id, vigente_desde desc);
create trigger precos_canal_auditoria after insert or update or delete on public.produtos_precos_canal for each row execute function app.auditar();

create view public.produtos_precos_vigentes with (security_invoker = true) as
select distinct on (produto_id, coalesce(variacao_id, '00000000-0000-0000-0000-000000000000'::uuid), canal_id) *
  from public.produtos_precos_canal
 where vigente_desde <= current_date and (vigente_ate is null or vigente_ate >= current_date)
 order by produto_id, coalesce(variacao_id, '00000000-0000-0000-0000-000000000000'::uuid), canal_id, vigente_desde desc, criado_em desc;

-- Anúncio do produto em um canal: chave de idempotência da importação e, na Fase 6, dos pedidos.
create table public.produtos_anuncios (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  variacao_id uuid references public.produtos_variacoes (id) on delete set null,
  canal_id uuid not null references public.canais_venda (id),
  codigo_externo text not null check (char_length(codigo_externo) between 1 and 80),
  titulo text,
  url text,
  preco numeric(14,2),
  estoque integer,
  vendas_total integer,
  vendas_periodo integer,
  visitas_periodo integer,
  conversao numeric(7,4),
  nota numeric(3,2),
  avaliacoes integer,
  fotos integer,
  categoria_externa text,
  coletado_em date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (canal_id, codigo_externo)
);
create index anuncios_produto on public.produtos_anuncios (produto_id);
create trigger anuncios_atualizado before update on public.produtos_anuncios for each row execute function app.carimbar_atualizacao();

create table public.produtos_arquivos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  variacao_id uuid references public.produtos_variacoes (id) on delete set null,
  tipo text not null check (tipo in ('stl', '3mf', 'gcode', 'imagem', 'documento')),
  nome text not null check (char_length(nome) between 1 and 200),
  bucket text check (bucket in ('arquivos-produto', 'fotos-produto')),
  storage_path text unique,
  caminho_externo text,
  versao integer not null default 1 check (versao >= 1),
  hash_sha256 text check (hash_sha256 ~ '^[0-9a-f]{64}$'),
  tamanho bigint check (tamanho >= 0),
  licenca text,
  notas text,
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now(),
  check (storage_path is not null or caminho_externo is not null)
);
create index arquivos_produto on public.produtos_arquivos (produto_id, tipo);

create table public.manutencoes (
  id uuid primary key default gen_random_uuid(),
  impressora_id uuid not null references public.impressoras (id) on delete cascade,
  tipo text not null check (tipo in ('preventiva', 'corretiva')),
  data date not null default current_date,
  custo numeric(14,2) not null default 0 check (custo >= 0),
  descricao text not null check (char_length(descricao) between 1 and 500),
  horas_no_momento numeric(14,2),
  proxima_em_horas numeric(14,2),
  lancamento_id uuid,
  criado_em timestamptz not null default now()
);
create index manutencoes_impressora on public.manutencoes (impressora_id, data desc);
create trigger manutencoes_auditoria after insert or update or delete on public.manutencoes for each row execute function app.auditar();

alter table public.calculos_custo
  add constraint calculos_custo_produto_fk foreign key (produto_id) references public.produtos (id) on delete set null,
  add constraint calculos_custo_variacao_fk foreign key (variacao_id) references public.produtos_variacoes (id) on delete set null;

alter table public.produtos enable row level security;
alter table public.produtos_variacoes enable row level security;
alter table public.produtos_materiais enable row level security;
alter table public.produtos_precos_canal enable row level security;
alter table public.produtos_anuncios enable row level security;
alter table public.produtos_arquivos enable row level security;
alter table public.manutencoes enable row level security;

create policy produtos_ler on public.produtos for select to authenticated using (app.usuario_ativo());
create policy produtos_escrever on public.produtos for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy variacoes_ler on public.produtos_variacoes for select to authenticated using (app.usuario_ativo());
create policy variacoes_escrever on public.produtos_variacoes for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy materiais_ler on public.produtos_materiais for select to authenticated using (app.usuario_ativo());
create policy materiais_escrever on public.produtos_materiais for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy precos_ler on public.produtos_precos_canal for select to authenticated using (app.usuario_ativo());
create policy precos_escrever on public.produtos_precos_canal for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy anuncios_ler on public.produtos_anuncios for select to authenticated using (app.usuario_ativo());
create policy anuncios_escrever on public.produtos_anuncios for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy arquivos_ler on public.produtos_arquivos for select to authenticated using (app.usuario_ativo());
create policy arquivos_escrever on public.produtos_arquivos for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy manutencoes_ler on public.manutencoes for select to authenticated using (app.usuario_ativo());
create policy manutencoes_escrever on public.manutencoes for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());

-- Buckets: arquivos de fabricação privados (URL assinada), fotos públicas só de imagem.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('arquivos-produto', 'arquivos-produto', false, 104857600, null),
       ('fotos-produto', 'fotos-produto', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;
create policy arquivos_produto_ler on storage.objects for select to authenticated using (bucket_id = 'arquivos-produto' and app.usuario_ativo());
create policy arquivos_produto_inserir on storage.objects for insert to authenticated with check (bucket_id = 'arquivos-produto' and app.pode_escrever());
create policy arquivos_produto_apagar on storage.objects for delete to authenticated using (bucket_id = 'arquivos-produto' and app.pode_escrever());
create policy fotos_produto_ler on storage.objects for select to anon, authenticated using (bucket_id = 'fotos-produto');
create policy fotos_produto_inserir on storage.objects for insert to authenticated with check (bucket_id = 'fotos-produto' and app.pode_escrever());
create policy fotos_produto_apagar on storage.objects for delete to authenticated using (bucket_id = 'fotos-produto' and app.pode_escrever());
