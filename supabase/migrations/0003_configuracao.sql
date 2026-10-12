-- 0003: canais de venda com taxas por vigência, categorias por escopo, unidades e sementes.

create table public.canais_venda (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(nome) between 1 and 80),
  tipo text not null check (tipo in ('shopee', 'mercado_livre', 'tiktok_shop', 'site', 'direto', 'outro')),
  ativo boolean not null default true,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger canais_venda_atualizado before update on public.canais_venda
  for each row execute function app.carimbar_atualizacao();
create trigger canais_venda_auditoria after insert or update or delete on public.canais_venda
  for each row execute function app.auditar();

-- Cada linha é uma vigência. Valores nulos = não configurado (nunca inventar taxa).
create table public.canais_venda_taxas (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid not null references public.canais_venda (id) on delete cascade,
  vigente_desde date not null,
  comissao_pct numeric(7,6) check (comissao_pct >= 0 and comissao_pct < 1),
  taxa_fixa_item numeric(14,2) check (taxa_fixa_item >= 0),
  taxa_pagamento_pct numeric(7,6) check (taxa_pagamento_pct >= 0 and taxa_pagamento_pct < 1),
  ads_pct_padrao numeric(7,6) check (ads_pct_padrao >= 0 and ads_pct_padrao < 1),
  frete_subsidio_padrao numeric(14,2) check (frete_subsidio_padrao >= 0),
  dias_repasse integer check (dias_repasse >= 0),
  observacoes text,
  criado_em timestamptz not null default now(),
  unique (canal_id, vigente_desde)
);
create trigger canais_venda_taxas_auditoria after insert or update or delete on public.canais_venda_taxas
  for each row execute function app.auditar();

create view public.canais_venda_vigentes with (security_invoker = true) as
select distinct on (c.id)
  c.id, c.nome, c.tipo, c.ativo, c.observacoes, c.criado_em, c.atualizado_em,
  t.id as taxas_id, t.vigente_desde, t.comissao_pct, t.taxa_fixa_item, t.taxa_pagamento_pct,
  t.ads_pct_padrao, t.frete_subsidio_padrao, t.dias_repasse
from public.canais_venda c
left join public.canais_venda_taxas t on t.canal_id = c.id and t.vigente_desde <= current_date
order by c.id, t.vigente_desde desc;

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  escopo text not null check (escopo in ('produto', 'insumo', 'financeiro', 'conhecimento', 'planejamento')),
  nome text not null check (char_length(nome) between 1 and 80),
  pai_id uuid references public.categorias (id),
  cor text check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (escopo, nome)
);
create trigger categorias_atualizado before update on public.categorias
  for each row execute function app.carimbar_atualizacao();
create trigger categorias_auditoria after insert or update or delete on public.categorias
  for each row execute function app.auditar();

create table public.unidades (
  codigo text primary key check (codigo ~ '^[a-z]{1,6}$'),
  nome text not null check (char_length(nome) between 1 and 40),
  base text references public.unidades (codigo),
  fator_para_base numeric(14,6) not null default 1 check (fator_para_base > 0)
);
create trigger unidades_auditoria after insert or update or delete on public.unidades
  for each row execute function app.auditar('codigo');

alter table public.canais_venda enable row level security;
alter table public.canais_venda_taxas enable row level security;
alter table public.categorias enable row level security;
alter table public.unidades enable row level security;

create policy canais_ler on public.canais_venda for select to authenticated using (app.usuario_ativo());
create policy canais_escrever on public.canais_venda for all to authenticated using (app.eh_dono()) with check (app.eh_dono());
create policy taxas_ler on public.canais_venda_taxas for select to authenticated using (app.usuario_ativo());
create policy taxas_escrever on public.canais_venda_taxas for all to authenticated using (app.eh_dono()) with check (app.eh_dono());
create policy categorias_ler on public.categorias for select to authenticated using (app.usuario_ativo());
create policy categorias_escrever on public.categorias for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy unidades_ler on public.unidades for select to authenticated using (app.usuario_ativo());
create policy unidades_escrever on public.unidades for all to authenticated using (app.eh_dono()) with check (app.eh_dono());

-- Sementes (idempotentes). Taxas ficam em branco de propósito.
insert into public.canais_venda (nome, tipo) values
  ('Shopee', 'shopee'), ('Mercado Livre', 'mercado_livre'), ('TikTok Shop', 'tiktok_shop'), ('Venda direta', 'direto')
on conflict (nome) do nothing;

insert into public.unidades (codigo, nome, base, fator_para_base) values
  ('g', 'grama', null, 1), ('kg', 'quilograma', 'g', 1000),
  ('un', 'unidade', null, 1),
  ('mm', 'milímetro', null, 1), ('cm', 'centímetro', 'mm', 10), ('m', 'metro', 'mm', 1000),
  ('ml', 'mililitro', null, 1), ('l', 'litro', 'ml', 1000),
  ('min', 'minuto', null, 1), ('h', 'hora', 'min', 60)
on conflict (codigo) do nothing;

insert into public.categorias (escopo, nome, ordem) values
  ('produto', 'Games', 1), ('produto', 'Miniaturas', 2), ('produto', 'Fórmula 1', 3), ('produto', 'Carros', 4), ('produto', 'Outros', 9),
  ('financeiro', 'Vendas em marketplace', 1), ('financeiro', 'Vendas diretas', 2),
  ('financeiro', 'Filamento e insumos', 10), ('financeiro', 'Energia', 11), ('financeiro', 'Taxas de marketplace', 12),
  ('financeiro', 'Embalagem e expedição', 13), ('financeiro', 'Manutenção de impressoras', 14), ('financeiro', 'Impostos', 15),
  ('financeiro', 'Software e assinaturas', 16), ('financeiro', 'Outras despesas', 19),
  ('conhecimento', 'Impressão 3D', 1), ('conhecimento', 'Materiais e filamentos', 2), ('conhecimento', 'Perfis de impressão', 3),
  ('conhecimento', 'Soluções para falhas', 4), ('conhecimento', 'Custos e formação de preço', 5), ('conhecimento', 'Processos internos', 6),
  ('conhecimento', 'Marketing e vendas', 7), ('conhecimento', 'Desenvolvimento de software', 8), ('conhecimento', 'Decisões de negócio', 9),
  ('conhecimento', 'Procedimentos operacionais', 10), ('conhecimento', 'Fornecedores', 11),
  ('planejamento', 'Conteúdo', 1), ('planejamento', 'Operação', 2), ('planejamento', 'Produto', 3), ('planejamento', 'Marketing', 4)
on conflict (escopo, nome) do nothing;
