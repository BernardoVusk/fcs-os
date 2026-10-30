-- 0029: catálogo público sob demanda (/catalogo). Itens vindos das coleções do MakerWorld,
-- importados por ferramentas/importar-catalogo.mjs (service role). A página pública lê pela
-- service role em dados/publico/catalogo.ts; nenhuma tabela fica aberta ao anônimo.

create table public.catalogo_categorias (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome text not null check (char_length(nome) between 1 and 60),
  ordem integer not null default 0,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger catalogo_categorias_atualizado before update on public.catalogo_categorias
  for each row execute function app.carimbar_atualizacao();
create trigger catalogo_categorias_auditoria after insert or update or delete on public.catalogo_categorias
  for each row execute function app.auditar();

create table public.catalogo_itens (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.catalogo_categorias (id),
  nome text not null check (char_length(nome) between 1 and 160),
  imagem text not null check (char_length(imagem) <= 200),
  makerworld_id bigint unique,
  fonte_url text check (char_length(fonte_url) <= 500),
  autor text check (char_length(autor) <= 120),
  licenca text check (char_length(licenca) <= 120),
  colecoes text[] not null default '{}',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index catalogo_itens_categoria on public.catalogo_itens (categoria_id, nome) where ativo;
create trigger catalogo_itens_atualizado before update on public.catalogo_itens
  for each row execute function app.carimbar_atualizacao();
create trigger catalogo_itens_auditoria after insert or update or delete on public.catalogo_itens
  for each row execute function app.auditar();

alter table public.catalogo_categorias enable row level security;
alter table public.catalogo_itens enable row level security;
create policy catalogo_categorias_ler on public.catalogo_categorias
  for select to authenticated using (app.usuario_ativo());
create policy catalogo_categorias_escrever on public.catalogo_categorias
  for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy catalogo_itens_ler on public.catalogo_itens
  for select to authenticated using (app.usuario_ativo());
create policy catalogo_itens_escrever on public.catalogo_itens
  for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());

-- Fotos já comprimidas (webp 600x600) servidas pela URL pública do bucket. Plano gratuito:
-- limite baixo por arquivo para nenhuma foto sem compressão entrar por engano.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogo', 'catalogo', true, 307200, array['image/webp'])
on conflict (id) do nothing;
create policy catalogo_ler on storage.objects for select to authenticated
  using (bucket_id = 'catalogo' and app.usuario_ativo());
create policy catalogo_inserir on storage.objects for insert to authenticated
  with check (bucket_id = 'catalogo' and app.pode_escrever());
create policy catalogo_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'catalogo' and app.pode_escrever());
