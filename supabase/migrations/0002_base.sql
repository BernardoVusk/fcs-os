-- 0002: usuários da aplicação, papéis, auditoria, alertas e tokens de integração.

create table public.usuarios_app (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 120),
  papel text not null check (papel in ('dono', 'operador', 'leitura')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger usuarios_app_atualizado before update on public.usuarios_app
  for each row execute function app.carimbar_atualizacao();

-- Papel do usuário logado. security definer evita recursão nas policies de usuarios_app.
create or replace function app.papel_atual() returns text
language sql stable security definer
set search_path = public, pg_temp
as $$ select papel from public.usuarios_app where id = auth.uid() and ativo; $$;
revoke execute on function app.papel_atual() from public, anon;
grant execute on function app.papel_atual() to authenticated, service_role;

create or replace function app.eh_dono() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select coalesce(app.papel_atual() = 'dono', false); $$;

create or replace function app.pode_escrever() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select coalesce(app.papel_atual() in ('dono', 'operador'), false); $$;

create or replace function app.usuario_ativo() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select app.papel_atual() is not null; $$;

revoke execute on function app.eh_dono(), app.pode_escrever(), app.usuario_ativo() from public, anon;
grant execute on function app.eh_dono(), app.pode_escrever(), app.usuario_ativo() to authenticated, service_role;

-- Origem da ação, lida do cabeçalho x-origem enviado pelo cliente. Sem cabeçalho = script.
create or replace function app.origem_atual() returns text
language plpgsql stable as $$
declare
  cabecalhos json;
  origem text;
begin
  begin
    cabecalhos := current_setting('request.headers', true)::json;
  exception when others then
    cabecalhos := null;
  end;
  if cabecalhos is null then return 'script'; end if;
  origem := cabecalhos ->> 'x-origem';
  if origem in ('web', 'mcp', 'script', 'importacao') then return origem; end if;
  return 'web';
end $$;

create table public.auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text not null,
  acao text not null check (acao in ('insert', 'update', 'delete')),
  antes jsonb,
  depois jsonb,
  usuario_id uuid,
  origem text not null,
  em timestamptz not null default now()
);
create index auditoria_registro on public.auditoria (tabela, registro_id, em desc);
create index auditoria_em on public.auditoria (em desc);
alter table public.auditoria enable row level security;
create policy auditoria_ler on public.auditoria for select to authenticated using (app.eh_dono());

-- Trigger genérico. security definer para gravar mesmo sem policy de insert para o usuário.
-- registro_id é text para servir tabelas com chave uuid e com chave texto (unidades).
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
    auth.uid(), app.origem_atual()
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

alter table public.usuarios_app enable row level security;
create policy usuarios_ler on public.usuarios_app for select to authenticated using (app.usuario_ativo());
create policy usuarios_inserir on public.usuarios_app for insert to authenticated with check (app.eh_dono());
create policy usuarios_alterar on public.usuarios_app for update to authenticated using (app.eh_dono()) with check (app.eh_dono());
create trigger usuarios_app_auditoria after insert or update or delete on public.usuarios_app
  for each row execute function app.auditar();

create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  severidade text not null check (severidade in ('info', 'atencao', 'critico')),
  titulo text not null,
  descricao text,
  entidade_tipo text,
  entidade_id uuid,
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  silenciado_ate timestamptz
);
create unique index alertas_aberto_unico on public.alertas (tipo, entidade_tipo, entidade_id)
  nulls not distinct where resolvido_em is null;
alter table public.alertas enable row level security;
create policy alertas_ler on public.alertas for select to authenticated using (app.usuario_ativo());
create policy alertas_inserir on public.alertas for insert to authenticated with check (app.pode_escrever());
create policy alertas_alterar on public.alertas for update to authenticated using (app.pode_escrever()) with check (app.pode_escrever());

create table public.tokens_integracao (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 80),
  hash_token text not null unique,
  prefixo text not null,
  usuario_id uuid not null references public.usuarios_app (id),
  escopos text[] not null default '{}',
  expira_em timestamptz,
  ultimo_uso_em timestamptz,
  revogado_em timestamptz,
  criado_em timestamptz not null default now()
);
alter table public.tokens_integracao enable row level security;
create policy tokens_dono on public.tokens_integracao for all to authenticated
  using (app.eh_dono()) with check (app.eh_dono());
create trigger tokens_auditoria after insert or update or delete on public.tokens_integracao
  for each row execute function app.auditar();
