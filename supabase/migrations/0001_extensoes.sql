-- 0001: extensões, schema de apoio e funções utilitárias.
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists app;
grant usage on schema app to authenticated, service_role;

-- Minúsculas sem acento. Marcada imutável para poder indexar (padrão aceito com unaccent).
create or replace function app.normalizar(texto text) returns text
language sql immutable parallel safe strict
set search_path = extensions, pg_temp
as $$ select lower(extensions.unaccent(texto)); $$;

create or replace function app.carimbar_atualizacao() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;
