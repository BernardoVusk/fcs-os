-- 0004: busca global por trigram sobre nomes normalizados. security invoker: RLS vale por tabela.

create index canais_venda_busca on public.canais_venda using gin (app.normalizar(nome) extensions.gin_trgm_ops);
create index categorias_busca on public.categorias using gin (app.normalizar(nome) extensions.gin_trgm_ops);
create index unidades_busca on public.unidades using gin (app.normalizar(nome) extensions.gin_trgm_ops);

create or replace function public.buscar_global(termo text, tipos text[] default null, limite integer default 8)
returns table (tipo text, id text, titulo text, subtitulo text, rota text, pontuacao real)
language sql stable security invoker
set search_path = public, extensions, pg_temp
as $$
with q as (select app.normalizar(coalesce(termo, '')) as t)
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
) r
order by r.pontuacao desc, r.tipo, r.titulo;
$$;
revoke execute on function public.buscar_global(text, text[], integer) from public, anon;
grant execute on function public.buscar_global(text, text[], integer) to authenticated, service_role;
