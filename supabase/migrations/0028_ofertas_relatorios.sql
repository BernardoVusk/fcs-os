-- 0028: Grupos de Ofertas, relatórios. Conversões e cliques vêm só dos relatórios oficiais das
-- plataformas (API ou arquivo exportado do portal), com origem e data de importação. Envio do
-- sistema, clique e venda ficam separados; nada é inferido de outro.

create table public.ofe_importacoes (
  id uuid primary key default gen_random_uuid(),
  plataforma text not null check (plataforma in ('shopee', 'mercado_livre', 'amazon', 'awin')),
  origem text not null check (origem in ('api', 'csv')),
  tipo text not null check (tipo in ('conversoes', 'cliques')),
  arquivo_hash text unique check (char_length(arquivo_hash) = 64),
  periodo_inicio timestamptz,
  periodo_fim timestamptz,
  linhas integer not null default 0,
  novas integer not null default 0,
  importado_em timestamptz not null default now(),
  importado_por uuid default app.usuario_da_requisicao()
);
create index ofe_importacoes_data on public.ofe_importacoes (plataforma, tipo, importado_em desc);
alter table public.ofe_importacoes enable row level security;
create policy ofe_importacoes_ler on public.ofe_importacoes for select to authenticated using (app.usuario_ativo());

create table public.ofe_conversoes (
  id uuid primary key default gen_random_uuid(),
  plataforma text not null check (plataforma in ('shopee', 'mercado_livre', 'amazon', 'awin')),
  ref_externa text not null check (char_length(ref_externa) between 1 and 120),
  ocorrida_em timestamptz not null,
  status text check (char_length(status) <= 60),
  valor_venda numeric(14, 2),
  comissao numeric(14, 2),
  moeda text check (char_length(moeda) <= 8),
  codigos text[] not null default '{}',
  grupo_id uuid references public.ofe_grupos (id) on delete set null,
  oferta_id uuid references public.ofe_ofertas (id) on delete set null,
  importacao_id uuid references public.ofe_importacoes (id) on delete set null,
  atualizado_em timestamptz not null default now(),
  unique (plataforma, ref_externa)
);
create index ofe_conversoes_periodo on public.ofe_conversoes (ocorrida_em, plataforma);
create index ofe_conversoes_grupo on public.ofe_conversoes (grupo_id, ocorrida_em);
alter table public.ofe_conversoes enable row level security;
create policy ofe_conversoes_ler on public.ofe_conversoes for select to authenticated using (app.usuario_ativo());

create table public.ofe_cliques_importados (
  id bigint generated always as identity primary key,
  plataforma text not null check (plataforma in ('shopee', 'mercado_livre', 'amazon', 'awin')),
  dia date not null,
  codigo text not null check (char_length(codigo) between 1 and 120),
  cliques integer not null check (cliques >= 0),
  grupo_id uuid references public.ofe_grupos (id) on delete set null,
  importacao_id uuid references public.ofe_importacoes (id) on delete set null,
  unique (plataforma, dia, codigo)
);
create index ofe_cliques_periodo on public.ofe_cliques_importados (dia, plataforma);
alter table public.ofe_cliques_importados enable row level security;
create policy ofe_cliques_ler on public.ofe_cliques_importados for select to authenticated using (app.usuario_ativo());

-- Grupo e oferta a partir dos códigos de atribuição: g<8 hex do grupo>, o<8 hex da oferta>
-- (sub ID da Shopee e clickref da Awin) ou o ID de rastreamento da Amazon cadastrado no grupo.
create or replace function app.ofe_grupo_do_codigo(p_codigos text[]) returns uuid
language sql stable set search_path = public, pg_temp as $$
  select g.id from public.ofe_grupos g, unnest(coalesce(p_codigos, '{}')) c
   where (c ~ '^g[0-9a-f]{8}$' and left(replace(g.id::text, '-', ''), 8) = substr(c, 2))
      or (g.tag_amazon is not null and g.tag_amazon = c)
   limit 1;
$$;
create or replace function app.ofe_oferta_do_codigo(p_codigos text[]) returns uuid
language sql stable set search_path = public, pg_temp as $$
  select o.id from public.ofe_ofertas o, unnest(coalesce(p_codigos, '{}')) c
   where c ~ '^o[0-9a-f]{8}$' and left(replace(o.id::text, '-', ''), 8) = substr(c, 2)
   limit 1;
$$;

-- Registro de conversões (upsert pela referência da plataforma). Arquivo repetido é recusado.
create or replace function public.ofe_registrar_conversoes(
  p_plataforma text, p_origem text, p_hash text, p_inicio timestamptz, p_fim timestamptz, p_linhas jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_imp uuid;
  l jsonb;
  v_codigos text[];
  v_novas integer := 0;
  v_total integer := 0;
  v_existia boolean;
begin
  if not app.pode_escrever() and auth.uid() is not null then raise exception 'sem_permissao'; end if;
  if p_hash is not null and exists (select 1 from public.ofe_importacoes where arquivo_hash = p_hash) then
    raise exception 'importacao_repetida';
  end if;
  insert into public.ofe_importacoes (plataforma, origem, tipo, arquivo_hash, periodo_inicio, periodo_fim)
  values (p_plataforma, p_origem, 'conversoes', p_hash, p_inicio, p_fim) returning id into v_imp;
  for l in select * from jsonb_array_elements(coalesce(p_linhas, '[]'::jsonb)) loop
    if coalesce(l->>'ref', '') = '' or l->>'data' is null then continue; end if;
    v_codigos := array(select left(x, 120) from jsonb_array_elements_text(coalesce(l->'codigos', '[]'::jsonb)) x where x <> '' limit 10);
    v_existia := exists (select 1 from public.ofe_conversoes where plataforma = p_plataforma and ref_externa = l->>'ref');
    insert into public.ofe_conversoes (plataforma, ref_externa, ocorrida_em, status, valor_venda, comissao, moeda, codigos, grupo_id, oferta_id, importacao_id)
    values (p_plataforma, left(l->>'ref', 120), (l->>'data')::timestamptz, left(l->>'status', 60),
            nullif(l->>'venda', '')::numeric, nullif(l->>'comissao', '')::numeric, left(l->>'moeda', 8), v_codigos,
            app.ofe_grupo_do_codigo(v_codigos), app.ofe_oferta_do_codigo(v_codigos), v_imp)
    on conflict (plataforma, ref_externa) do update
      set status = excluded.status, valor_venda = coalesce(excluded.valor_venda, public.ofe_conversoes.valor_venda),
          comissao = coalesce(excluded.comissao, public.ofe_conversoes.comissao), codigos = excluded.codigos,
          grupo_id = coalesce(excluded.grupo_id, public.ofe_conversoes.grupo_id),
          oferta_id = coalesce(excluded.oferta_id, public.ofe_conversoes.oferta_id),
          importacao_id = excluded.importacao_id, atualizado_em = now();
    v_total := v_total + 1;
    if not v_existia then v_novas := v_novas + 1; end if;
  end loop;
  update public.ofe_importacoes set linhas = v_total, novas = v_novas where id = v_imp;
  return jsonb_build_object('linhas', v_total, 'novas', v_novas);
end $$;
revoke execute on function public.ofe_registrar_conversoes(text, text, text, timestamptz, timestamptz, jsonb) from public, anon;
grant execute on function public.ofe_registrar_conversoes(text, text, text, timestamptz, timestamptz, jsonb) to authenticated;

create or replace function public.ofe_registrar_cliques(p_plataforma text, p_hash text, p_linhas jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_imp uuid;
  l jsonb;
  v_total integer := 0;
begin
  if not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  if p_hash is not null and exists (select 1 from public.ofe_importacoes where arquivo_hash = p_hash) then
    raise exception 'importacao_repetida';
  end if;
  insert into public.ofe_importacoes (plataforma, origem, tipo, arquivo_hash) values (p_plataforma, 'csv', 'cliques', p_hash) returning id into v_imp;
  for l in select * from jsonb_array_elements(coalesce(p_linhas, '[]'::jsonb)) loop
    if l->>'dia' is null or coalesce(l->>'codigo', '') = '' or (l->>'cliques') is null then continue; end if;
    insert into public.ofe_cliques_importados (plataforma, dia, codigo, cliques, grupo_id, importacao_id)
    values (p_plataforma, (l->>'dia')::date, left(l->>'codigo', 120), (l->>'cliques')::integer,
            app.ofe_grupo_do_codigo(array[l->>'codigo']), v_imp)
    on conflict (plataforma, dia, codigo) do update set cliques = excluded.cliques, importacao_id = excluded.importacao_id,
      grupo_id = coalesce(excluded.grupo_id, public.ofe_cliques_importados.grupo_id);
    v_total := v_total + 1;
  end loop;
  update public.ofe_importacoes set linhas = v_total, novas = v_total where id = v_imp;
  return jsonb_build_object('linhas', v_total);
end $$;
revoke execute on function public.ofe_registrar_cliques(text, text, jsonb) from public, anon;
grant execute on function public.ofe_registrar_cliques(text, text, jsonb) to authenticated;

-- Relatórios (security invoker: a RLS de quem consulta vale).
create or replace function public.ofe_relatorio_envios(
  p_inicio timestamptz, p_fim timestamptz, p_grupo uuid default null, p_plataforma text default null,
  p_fila uuid default null, p_numero uuid default null, p_campanha text default null
) returns table (
  grupo_id uuid, grupo text, plataforma text, fila_id uuid, fila text, numero_id uuid, numero text, modo text,
  enviados bigint, falhas bigint, incertos bigint, ignorados bigint
)
language sql stable security invoker set search_path = public, pg_temp as $$
  select e.grupo_id, g.nome, coalesce(o.plataforma, c.plataforma), p.fila_id, f.nome, e.numero_id, n.rotulo, e.modo,
         count(*) filter (where e.status = 'enviado'), count(*) filter (where e.status = 'falhou'),
         count(*) filter (where e.status = 'incerto'), count(*) filter (where e.status = 'ignorado')
    from public.ofe_envios e
    join public.ofe_publicacoes p on p.id = e.publicacao_id
    join public.ofe_grupos g on g.id = e.grupo_id
    left join public.ofe_ofertas o on o.id = p.oferta_id
    left join public.ofe_cupons c on c.id = p.cupom_id
    left join public.ofe_filas f on f.id = p.fila_id
    left join public.ofe_numeros n on n.id = e.numero_id
   where coalesce(e.enviado_em, e.agendado_para) >= p_inicio and coalesce(e.enviado_em, e.agendado_para) < p_fim
     and (p_grupo is null or e.grupo_id = p_grupo)
     and (p_plataforma is null or coalesce(o.plataforma, c.plataforma) = p_plataforma)
     and (p_fila is null or p.fila_id = p_fila)
     and (p_numero is null or e.numero_id = p_numero)
     and (p_campanha is null or coalesce(o.campanha, g.campanha) = p_campanha)
   group by 1, 2, 3, 4, 5, 6, 7, 8;
$$;

create or replace function public.ofe_relatorio_conversoes(
  p_inicio timestamptz, p_fim timestamptz, p_grupo uuid default null, p_plataforma text default null
) returns table (grupo_id uuid, grupo text, plataforma text, status text, pedidos bigint, venda numeric, comissao numeric)
language sql stable security invoker set search_path = public, pg_temp as $$
  select c.grupo_id, g.nome, c.plataforma, coalesce(c.status, 'sem status'), count(*), sum(c.valor_venda), sum(c.comissao)
    from public.ofe_conversoes c left join public.ofe_grupos g on g.id = c.grupo_id
   where c.ocorrida_em >= p_inicio and c.ocorrida_em < p_fim
     and (p_grupo is null or c.grupo_id = p_grupo) and (p_plataforma is null or c.plataforma = p_plataforma)
   group by 1, 2, 3, 4;
$$;

create or replace function public.ofe_relatorio_cliques(
  p_inicio date, p_fim date, p_grupo uuid default null, p_plataforma text default null
) returns table (grupo_id uuid, grupo text, plataforma text, cliques bigint)
language sql stable security invoker set search_path = public, pg_temp as $$
  select k.grupo_id, g.nome, k.plataforma, sum(k.cliques)
    from public.ofe_cliques_importados k left join public.ofe_grupos g on g.id = k.grupo_id
   where k.dia >= p_inicio and k.dia < p_fim
     and (p_grupo is null or k.grupo_id = p_grupo) and (p_plataforma is null or k.plataforma = p_plataforma)
   group by 1, 2, 3;
$$;

revoke execute on function public.ofe_relatorio_envios(timestamptz, timestamptz, uuid, text, uuid, uuid, text) from public, anon;
revoke execute on function public.ofe_relatorio_conversoes(timestamptz, timestamptz, uuid, text) from public, anon;
revoke execute on function public.ofe_relatorio_cliques(date, date, uuid, text) from public, anon;
grant execute on function public.ofe_relatorio_envios(timestamptz, timestamptz, uuid, text, uuid, uuid, text) to authenticated;
grant execute on function public.ofe_relatorio_conversoes(timestamptz, timestamptz, uuid, text) to authenticated;
grant execute on function public.ofe_relatorio_cliques(date, date, uuid, text) to authenticated;
