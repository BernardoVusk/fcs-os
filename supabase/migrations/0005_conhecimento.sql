-- 0005: base de conhecimento (registros, versões, relações, anexos), busca com acento,
-- autoria de chamadas feitas pela service role (MCP) e motivo de alteração.

-- Configuração de busca em português sem acento (dicionário unaccent da extensão).
create text search configuration app.pt (copy = portuguese);
alter text search configuration app.pt
  alter mapping for hword, hword_part, word with extensions.unaccent, portuguese_stem;

-- Vetor de busca do conhecimento. Declarada imutável de propósito: a configuração app.pt é
-- fixa e array_to_string, que o Postgres marca como estável, só concatena texto aqui.
create or replace function app.conhecimento_busca(titulo text, resumo text, tags text[], conteudo text)
returns tsvector
language sql immutable parallel safe
set search_path = pg_catalog, pg_temp
as $$
  select setweight(to_tsvector('app.pt', coalesce(titulo, '')), 'A') ||
         setweight(to_tsvector('app.pt', coalesce(resumo, '')), 'B') ||
         setweight(to_tsvector('app.pt', coalesce(array_to_string(tags, ' '), '')), 'B') ||
         setweight(to_tsvector('app.pt', coalesce(conteudo, '')), 'C');
$$;

-- Quem fez a requisição: usuário logado ou, quando a chamada é da service role
-- (servidor MCP, scripts), o usuário informado no cabeçalho x-usuario-id.
create or replace function app.usuario_da_requisicao() returns uuid
language plpgsql stable as $$
declare
  cab json;
  v text;
begin
  if auth.uid() is not null then return auth.uid(); end if;
  if coalesce(auth.role(), '') <> 'service_role' then return null; end if;
  begin
    cab := current_setting('request.headers', true)::json;
  exception when others then
    return null;
  end;
  if cab is null then return null; end if;
  v := cab ->> 'x-usuario-id';
  if v is null or v = '' then return null; end if;
  return v::uuid;
exception when others then
  return null;
end $$;

-- Motivo de uma alteração, enviado no cabeçalho x-motivo (opcional).
create or replace function app.motivo_atual() returns text
language plpgsql stable as $$
declare
  cab json;
begin
  begin
    cab := current_setting('request.headers', true)::json;
  exception when others then
    return null;
  end;
  if cab is null then return null; end if;
  return nullif(left(cab ->> 'x-motivo', 300), '');
end $$;

-- Auditoria passa a atribuir o usuário também nas chamadas da service role.
create or replace function app.auditar() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  rid text;
  chave text := coalesce(tg_argv[0], 'id');
begin
  if tg_op = 'DELETE' then rid := (to_jsonb(old) ->> chave); else rid := (to_jsonb(new) ->> chave); end if;
  insert into public.auditoria (tabela, registro_id, acao, antes, depois, usuario_id, origem)
  values (
    tg_table_name, rid, lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end,
    app.usuario_da_requisicao(), app.origem_atual()
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create table public.conhecimentos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null check (char_length(titulo) between 3 and 160),
  resumo text check (char_length(resumo) <= 400),
  conteudo text not null check (char_length(conteudo) <= 60000),
  tipo text not null check (tipo in ('procedimento', 'solucao', 'decisao', 'referencia', 'perfil_impressao', 'nota')),
  categoria_id uuid references public.categorias (id),
  tags text[] not null default '{}',
  modulo text check (char_length(modulo) <= 60),
  projeto text check (char_length(projeto) <= 80),
  origem text not null default 'manual' check (origem in ('manual', 'claude_code', 'importacao')),
  referencia text check (char_length(referencia) <= 500),
  confidencialidade text not null default 'interno' check (confidencialidade in ('interno', 'restrito')),
  estrutura jsonb,
  validado boolean not null default false,
  validado_por uuid,
  validado_em timestamptz,
  status text not null default 'ativo' check (status in ('rascunho', 'ativo', 'arquivado')),
  versao integer not null default 1,
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  busca tsvector generated always as (app.conhecimento_busca(titulo, resumo, tags, conteudo)) stored
);
create index conhecimentos_busca on public.conhecimentos using gin (busca);
create index conhecimentos_titulo_trgm on public.conhecimentos using gin (app.normalizar(titulo) extensions.gin_trgm_ops);
create index conhecimentos_tags on public.conhecimentos using gin (tags);
create index conhecimentos_tipo_status on public.conhecimentos (tipo, status, atualizado_em desc);

-- Versão N guarda o estado que vigorou até a alteração N+1, com quem alterou e por quê.
create table public.conhecimentos_versoes (
  id bigint generated always as identity primary key,
  conhecimento_id uuid not null references public.conhecimentos (id) on delete cascade,
  versao integer not null,
  titulo text not null,
  resumo text,
  conteudo text not null,
  tags text[] not null default '{}',
  estrutura jsonb,
  alterado_por uuid,
  origem text,
  motivo text,
  em timestamptz not null default now(),
  unique (conhecimento_id, versao)
);

create table public.conhecimentos_relacoes (
  de_id uuid not null references public.conhecimentos (id) on delete cascade,
  para_id uuid not null references public.conhecimentos (id) on delete cascade,
  tipo text not null check (tipo in ('relacionado', 'substitui', 'deriva_de')),
  criado_em timestamptz not null default now(),
  primary key (de_id, para_id),
  check (de_id <> para_id)
);

create table public.conhecimentos_anexos (
  id uuid primary key default gen_random_uuid(),
  conhecimento_id uuid not null references public.conhecimentos (id) on delete cascade,
  storage_path text not null unique,
  nome text not null check (char_length(nome) between 1 and 200),
  tamanho integer,
  tipo text,
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now()
);

create or replace function app.versionar_conhecimento() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.titulo is distinct from old.titulo
     or new.resumo is distinct from old.resumo
     or new.conteudo is distinct from old.conteudo
     or new.tags is distinct from old.tags
     or new.estrutura is distinct from old.estrutura then
    insert into public.conhecimentos_versoes
      (conhecimento_id, versao, titulo, resumo, conteudo, tags, estrutura, alterado_por, origem, motivo)
    values
      (old.id, old.versao, old.titulo, old.resumo, old.conteudo, old.tags, old.estrutura,
       app.usuario_da_requisicao(), app.origem_atual(), app.motivo_atual());
    new.versao := old.versao + 1;
  end if;
  new.atualizado_em := now();
  return new;
end $$;
create trigger conhecimentos_versionar before update on public.conhecimentos
  for each row execute function app.versionar_conhecimento();
create trigger conhecimentos_auditoria after insert or update or delete on public.conhecimentos
  for each row execute function app.auditar();

alter table public.conhecimentos enable row level security;
alter table public.conhecimentos_versoes enable row level security;
alter table public.conhecimentos_relacoes enable row level security;
alter table public.conhecimentos_anexos enable row level security;

create policy conhecimentos_ler on public.conhecimentos for select to authenticated
  using (app.usuario_ativo() and (confidencialidade = 'interno' or app.eh_dono()));
create policy conhecimentos_inserir on public.conhecimentos for insert to authenticated with check (app.pode_escrever());
create policy conhecimentos_alterar on public.conhecimentos for update to authenticated
  using (app.pode_escrever() and (confidencialidade = 'interno' or app.eh_dono())) with check (app.pode_escrever());
create policy conhecimentos_apagar on public.conhecimentos for delete to authenticated using (app.eh_dono());

create policy versoes_ler on public.conhecimentos_versoes for select to authenticated
  using (exists (select 1 from public.conhecimentos c where c.id = conhecimento_id));
create policy relacoes_ler on public.conhecimentos_relacoes for select to authenticated using (app.usuario_ativo());
create policy relacoes_escrever on public.conhecimentos_relacoes for all to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());
create policy anexos_ler on public.conhecimentos_anexos for select to authenticated
  using (exists (select 1 from public.conhecimentos c where c.id = conhecimento_id));
create policy anexos_escrever on public.conhecimentos_anexos for all to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());

-- Bucket privado dos anexos (10 MB por arquivo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anexos-conhecimento', 'anexos-conhecimento', false, 10485760,
        array['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown'])
on conflict (id) do nothing;
create policy anexos_objetos_ler on storage.objects for select to authenticated
  using (bucket_id = 'anexos-conhecimento' and app.usuario_ativo());
create policy anexos_objetos_inserir on storage.objects for insert to authenticated
  with check (bucket_id = 'anexos-conhecimento' and app.pode_escrever());
create policy anexos_objetos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'anexos-conhecimento' and app.pode_escrever());

-- Busca global ganha o ramo de conhecimento (texto completo + título por trigram).
create or replace function public.buscar_global(termo text, tipos text[] default null, limite integer default 8)
returns table (tipo text, id text, titulo text, subtitulo text, rota text, pontuacao real)
language sql stable security invoker
set search_path = public, extensions, pg_temp
as $$
with q as (
  select app.normalizar(coalesce(termo, '')) as t,
         websearch_to_tsquery('app.pt', coalesce(termo, '')) as tsq
)
select r.tipo, r.id, r.titulo, r.subtitulo, r.rota, r.pontuacao from (
  (select 'canal'::text as tipo, c.id::text as id, c.nome as titulo, c.tipo as subtitulo,
          '/configuracoes/canais/' || c.id as rota,
          greatest(similarity(app.normalizar(c.nome), q.t),
                   case when app.normalizar(c.nome) like '%' || q.t || '%' then 0.9 else 0 end)::real as pontuacao
     from public.canais_venda c, q
    where (tipos is null or 'canal' = any (tipos)) and char_length(q.t) >= 2
      and (app.normalizar(c.nome) % q.t or app.normalizar(c.nome) like '%' || q.t || '%')
    order by 6 desc limit limite)
  union all
  (select 'categoria'::text, k.id::text, k.nome, k.escopo,
          '/configuracoes/categorias?escopo=' || k.escopo || '&destaque=' || k.id,
          greatest(similarity(app.normalizar(k.nome), q.t),
                   case when app.normalizar(k.nome) like '%' || q.t || '%' then 0.9 else 0 end)::real
     from public.categorias k, q
    where (tipos is null or 'categoria' = any (tipos)) and char_length(q.t) >= 2
      and (app.normalizar(k.nome) % q.t or app.normalizar(k.nome) like '%' || q.t || '%')
    order by 6 desc limit limite)
  union all
  (select 'unidade'::text, u.codigo, u.nome, u.codigo,
          '/configuracoes/unidades?destaque=' || u.codigo,
          greatest(similarity(app.normalizar(u.nome), q.t),
                   case when app.normalizar(u.nome) like '%' || q.t || '%' or u.codigo = q.t then 0.9 else 0 end)::real
     from public.unidades u, q
    where (tipos is null or 'unidade' = any (tipos)) and char_length(q.t) >= 1
      and (app.normalizar(u.nome) % q.t or app.normalizar(u.nome) like '%' || q.t || '%' or u.codigo = q.t)
    order by 6 desc limit limite)
  union all
  (select 'conhecimento'::text, n.id::text, n.titulo, n.tipo, '/conhecimento/' || n.id,
          greatest(ts_rank(n.busca, q.tsq) * 2,
                   similarity(app.normalizar(n.titulo), q.t),
                   case when app.normalizar(n.titulo) like '%' || q.t || '%' then 0.9 else 0 end)::real
     from public.conhecimentos n, q
    where (tipos is null or 'conhecimento' = any (tipos)) and char_length(q.t) >= 2
      and n.status <> 'arquivado'
      and (n.busca @@ q.tsq or app.normalizar(n.titulo) % q.t or app.normalizar(n.titulo) like '%' || q.t || '%')
    order by 6 desc limit limite)
) r
order by r.pontuacao desc, r.tipo, r.titulo;
$$;
