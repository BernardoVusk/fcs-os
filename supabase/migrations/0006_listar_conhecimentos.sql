-- 0006: listagem de conhecimentos com texto completo por função (o PostgREST não aceita
-- configuração de busca com esquema no filtro wfts). security invoker: RLS vale.
create or replace function public.listar_conhecimentos(
  p_termo text default null,
  p_tipo text default null,
  p_categoria uuid default null,
  p_tag text default null,
  p_status text default null,
  p_modulo text default null,
  p_limite integer default 50
)
returns setof public.conhecimentos
language sql stable security invoker
set search_path = public, extensions, pg_temp
as $$
  with q as (
    select nullif(trim(p_termo), '') as termo,
           case when nullif(trim(p_termo), '') is null then null
                else websearch_to_tsquery('app.pt', p_termo) end as tsq
  )
  select c.*
    from public.conhecimentos c, q
   where (case when p_status is null then c.status <> 'arquivado' else c.status = p_status end)
     and (p_tipo is null or c.tipo = p_tipo)
     and (p_categoria is null or c.categoria_id = p_categoria)
     and (p_tag is null or c.tags @> array[p_tag])
     and (p_modulo is null or c.modulo = p_modulo)
     and (q.termo is null
          or c.busca @@ q.tsq
          or app.normalizar(c.titulo) like '%' || app.normalizar(q.termo) || '%')
   order by case when q.termo is null then 0 else ts_rank(c.busca, q.tsq) end desc,
            c.atualizado_em desc
   limit least(greatest(coalesce(p_limite, 50), 1), 100);
$$;
revoke execute on function public.listar_conhecimentos(text, text, uuid, text, text, text, integer) from public, anon;
grant execute on function public.listar_conhecimentos(text, text, uuid, text, text, text, integer) to authenticated, service_role;
