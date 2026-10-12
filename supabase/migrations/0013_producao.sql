-- 0013: ordens de produção, consumo por lote, estoque de peças prontas (média móvel) e as funções
-- atômicas concluir_ordem_producao e reabrir_ordem_producao (estorna, nunca apaga).

create sequence app.ordens_producao_seq;
grant usage, select on sequence app.ordens_producao_seq to authenticated, service_role;

create table public.ordens_producao (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default 'OP-' || lpad(nextval('app.ordens_producao_seq')::text, 4, '0'),
  produto_id uuid not null references public.produtos (id),
  variacao_id uuid references public.produtos_variacoes (id),
  pedido_item_id uuid,
  impressora_id uuid references public.impressoras (id),
  lote_id uuid references public.lotes_insumo (id),
  quantidade_planejada integer not null check (quantidade_planejada > 0),
  quantidade_aprovada integer not null default 0 check (quantidade_aprovada >= 0),
  quantidade_perdida integer not null default 0 check (quantidade_perdida >= 0),
  motivo_falha text,
  status text not null default 'fila' check (status in ('fila', 'imprimindo', 'acabamento', 'concluida', 'cancelada')),
  prioridade integer not null default 0,
  prazo date,
  inicio_previsto timestamptz,
  fim_previsto timestamptz,
  inicio_real timestamptz,
  fim_real timestamptz,
  tempo_previsto_min numeric(10,1) check (tempo_previsto_min >= 0),
  tempo_real_min numeric(10,1) check (tempo_real_min >= 0),
  minutos_mao_de_obra numeric(10,1) check (minutos_mao_de_obra >= 0),
  calculo_estimado_id uuid references public.calculos_custo (id),
  custo_estimado numeric(14,4),
  custo_realizado numeric(14,4),
  custo_realizado_detalhe jsonb,
  instrucoes text,
  responsavel text,
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index ordens_status on public.ordens_producao (status, prioridade desc, prazo);
create index ordens_impressora on public.ordens_producao (impressora_id, status);
create index ordens_produto on public.ordens_producao (produto_id);
create trigger ordens_atualizado before update on public.ordens_producao for each row execute function app.carimbar_atualizacao();
create trigger ordens_auditoria after insert or update or delete on public.ordens_producao for each row execute function app.auditar();

create table public.ordens_consumo (
  id uuid primary key default gen_random_uuid(),
  ordem_id uuid not null references public.ordens_producao (id) on delete cascade,
  insumo_id uuid not null references public.insumos (id),
  lote_id uuid references public.lotes_insumo (id),
  quantidade_prevista numeric(14,3),
  quantidade_real numeric(14,3),
  valor numeric(14,4),
  custo_unitario numeric(14,6),
  movimentacoes uuid[] not null default '{}',
  criado_em timestamptz not null default now()
);
create index ordens_consumo_ordem on public.ordens_consumo (ordem_id);

-- Peças prontas: razão imutável por produto e variação, valorado pela média móvel.
create table public.movimentacoes_produto (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id),
  variacao_id uuid references public.produtos_variacoes (id),
  tipo text not null check (tipo in ('producao', 'venda', 'ajuste', 'perda', 'devolucao', 'estorno')),
  quantidade integer not null check (quantidade <> 0),
  valor numeric(14,4) not null default 0,
  custo_unitario_momento numeric(14,6),
  motivo text,
  origem_tipo text check (origem_tipo in ('ordem', 'pedido', 'manual', 'estorno')),
  origem_id uuid,
  usuario_id uuid default app.usuario_da_requisicao(),
  em timestamptz not null default now()
);
create index mov_produto_produto on public.movimentacoes_produto (produto_id, em desc);
create index mov_produto_origem on public.movimentacoes_produto (origem_tipo, origem_id);

create view public.estoque_produtos with (security_invoker = true) as
select p.id as produto_id, m.variacao_id, p.nome,
       coalesce(sum(m.quantidade), 0)::integer as saldo,
       coalesce(sum(m.valor), 0) as valor,
       case when coalesce(sum(m.quantidade), 0) > 0 then round(sum(m.valor) / sum(m.quantidade), 6) else null end as custo_medio
  from public.produtos p
  left join public.movimentacoes_produto m on m.produto_id = p.id
 group by p.id, m.variacao_id;

alter table public.ordens_producao enable row level security;
alter table public.ordens_consumo enable row level security;
alter table public.movimentacoes_produto enable row level security;
create policy ordens_ler on public.ordens_producao for select to authenticated using (app.usuario_ativo());
create policy ordens_escrever on public.ordens_producao for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy ordens_consumo_ler on public.ordens_consumo for select to authenticated using (app.usuario_ativo());
create policy ordens_consumo_escrever on public.ordens_consumo for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy mov_produto_ler on public.movimentacoes_produto for select to authenticated using (app.usuario_ativo());
create policy mov_produto_inserir on public.movimentacoes_produto for insert to authenticated with check (app.pode_escrever());

-- Concluir: consome os lotes (movimentar_estoque), calcula o custo realizado só variável, dá entrada nas
-- peças boas e fecha a ordem. p_consumos: [{insumo_id, lote_id, quantidade}].
create or replace function public.concluir_ordem_producao(
  p_ordem uuid, p_aprovadas integer, p_perdidas integer, p_tempo_real_min numeric, p_minutos_mao_de_obra numeric,
  p_consumos jsonb, p_custo_hora_mao_obra numeric, p_complementares_por_peca numeric default 0,
  p_motivo_falha text default null, p_permitir_negativo boolean default false, p_justificativa text default null
) returns jsonb
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  o record;
  imp record;
  c jsonb;
  r jsonb;
  v_ids uuid[];
  v_valor numeric;
  v_material numeric := 0;
  v_maquina numeric := 0;
  v_energia numeric := 0;
  v_mao numeric;
  v_compl numeric;
  v_total numeric;
  v_horas numeric;
  v_tarifa numeric;
  v_avisos text[] := '{}';
  v_mov uuid;
  v_por_peca numeric;
begin
  if p_aprovadas is null or p_aprovadas < 0 or p_perdidas is null or p_perdidas < 0 then raise exception 'quantidade_invalida'; end if;
  if p_aprovadas + p_perdidas = 0 then raise exception 'ordem_sem_pecas'; end if;
  select * into o from public.ordens_producao where id = p_ordem for update;
  if not found then raise exception 'ordem_nao_encontrada'; end if;
  if o.status not in ('fila', 'imprimindo', 'acabamento') then raise exception 'ordem_nao_aberta'; end if;

  -- Material: cada consumo sai do lote informado ao custo do lote (PEPS completa se faltar).
  for c in select * from jsonb_array_elements(coalesce(p_consumos, '[]'::jsonb)) loop
    if coalesce((c->>'quantidade')::numeric, 0) <= 0 then continue; end if;
    r := public.movimentar_estoque(
      (c->>'insumo_id')::uuid, 'consumo_producao', (c->>'quantidade')::numeric, nullif(c->>'lote_id', '')::uuid,
      'Ordem ' || o.codigo, 'ordem', p_ordem, p_permitir_negativo, p_justificativa);
    select array_agg((e)::uuid) into v_ids from jsonb_array_elements_text(r->'movimentacoes') e;
    select coalesce(-sum(valor), 0) into v_valor from public.movimentacoes_estoque where id = any (v_ids);
    v_material := v_material + v_valor;
    insert into public.ordens_consumo (ordem_id, insumo_id, lote_id, quantidade_prevista, quantidade_real, valor, custo_unitario, movimentacoes)
    values (p_ordem, (c->>'insumo_id')::uuid, nullif(c->>'lote_id', '')::uuid, (c->>'quantidade_prevista')::numeric, (c->>'quantidade')::numeric,
            round(v_valor, 4), round(v_valor / (c->>'quantidade')::numeric, 6), v_ids);
    if jsonb_array_length(r->'alertas') > 0 then
      select array_cat(v_avisos, array_agg(a)) into v_avisos from jsonb_array_elements_text(r->'alertas') a;
    end if;
  end loop;

  -- Máquina e energia nas horas reais, pelos campos da impressora e pela tarifa vigente.
  v_horas := coalesce(p_tempo_real_min, 0) / 60;
  if o.impressora_id is not null then
    select * into imp from public.impressoras where id = o.impressora_id;
    select (dados->>'tarifa_kwh')::numeric into v_tarifa from public.parametros_custo_vigentes;
    if imp.custo_aquisicao is null or imp.vida_util_horas is null or imp.horas_produtivas_ano is null or imp.custo_manutencao_ano is null or imp.custo_consumiveis_ano is null or imp.potencia_media_w is null then
      v_avisos := array_append(v_avisos, 'impressora_sem_custo');
    else
      v_maquina := v_horas * ((imp.custo_aquisicao - coalesce(imp.valor_residual, 0)) / imp.vida_util_horas + (imp.custo_manutencao_ano + imp.custo_consumiveis_ano) / imp.horas_produtivas_ano);
      if v_tarifa is null then v_avisos := array_append(v_avisos, 'tarifa_nao_configurada');
      else v_energia := v_horas * imp.potencia_media_w / 1000 * v_tarifa; end if;
    end if;
    update public.impressoras set horas_uso = horas_uso + v_horas where id = o.impressora_id;
  end if;
  v_mao := coalesce(p_minutos_mao_de_obra, 0) / 60 * coalesce(p_custo_hora_mao_obra, 0);
  v_compl := coalesce(p_complementares_por_peca, 0) * p_aprovadas;
  v_total := v_material + v_maquina + v_energia + v_mao + v_compl;
  v_por_peca := case when p_aprovadas > 0 then v_total / p_aprovadas else null end;

  if p_aprovadas > 0 then
    insert into public.movimentacoes_produto (produto_id, variacao_id, tipo, quantidade, valor, custo_unitario_momento, motivo, origem_tipo, origem_id)
    values (o.produto_id, o.variacao_id, 'producao', p_aprovadas, round(v_total, 4), round(v_por_peca, 6), 'Ordem ' || o.codigo, 'ordem', p_ordem)
    returning id into v_mov;
  end if;

  update public.ordens_producao
     set status = 'concluida', quantidade_aprovada = p_aprovadas, quantidade_perdida = p_perdidas, motivo_falha = p_motivo_falha,
         tempo_real_min = p_tempo_real_min, minutos_mao_de_obra = p_minutos_mao_de_obra, fim_real = now(),
         inicio_real = coalesce(inicio_real, now()), custo_realizado = round(v_total, 4),
         custo_realizado_detalhe = jsonb_build_object(
           'material', round(v_material, 4), 'maquina', round(v_maquina, 4), 'energia', round(v_energia, 4),
           'mao_de_obra', round(v_mao, 4), 'complementares', round(v_compl, 4), 'total', round(v_total, 4),
           'por_peca_boa', round(v_por_peca, 4), 'perda_producao', case when p_aprovadas = 0 then round(v_total, 4) else 0 end,
           'avisos', to_jsonb(v_avisos), 'movimentacao_produto', v_mov)
   where id = p_ordem;
  return (select custo_realizado_detalhe from public.ordens_producao where id = p_ordem);
end $$;

-- Reabrir: estorna cada movimentação de estoque e a entrada de peças prontas, devolve horas e volta para acabamento.
create or replace function public.reabrir_ordem_producao(p_ordem uuid, p_motivo text) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  o record;
  m uuid;
  mp record;
begin
  select * into o from public.ordens_producao where id = p_ordem for update;
  if not found then raise exception 'ordem_nao_encontrada'; end if;
  if o.status <> 'concluida' then raise exception 'ordem_nao_concluida'; end if;
  for m in select unnest(movimentacoes) from public.ordens_consumo where ordem_id = p_ordem loop
    perform public.estornar_movimentacao(m, coalesce(p_motivo, 'Ordem reaberta'));
  end loop;
  delete from public.ordens_consumo where ordem_id = p_ordem;
  for mp in select * from public.movimentacoes_produto where origem_tipo = 'ordem' and origem_id = p_ordem and tipo = 'producao'
    and not exists (select 1 from public.movimentacoes_produto e where e.origem_tipo = 'estorno' and e.origem_id = movimentacoes_produto.id) loop
    insert into public.movimentacoes_produto (produto_id, variacao_id, tipo, quantidade, valor, custo_unitario_momento, motivo, origem_tipo, origem_id)
    values (mp.produto_id, mp.variacao_id, 'estorno', -mp.quantidade, -mp.valor, mp.custo_unitario_momento, coalesce(p_motivo, 'Ordem reaberta'), 'estorno', mp.id);
  end loop;
  if o.impressora_id is not null and o.tempo_real_min is not null then
    update public.impressoras set horas_uso = greatest(0, horas_uso - o.tempo_real_min / 60) where id = o.impressora_id;
  end if;
  update public.ordens_producao set status = 'acabamento', custo_realizado = null, custo_realizado_detalhe = null, fim_real = null where id = p_ordem;
end $$;

revoke execute on function public.concluir_ordem_producao(uuid, integer, integer, numeric, numeric, jsonb, numeric, numeric, text, boolean, text) from public, anon;
grant execute on function public.concluir_ordem_producao(uuid, integer, integer, numeric, numeric, jsonb, numeric, numeric, text, boolean, text) to authenticated, service_role;
revoke execute on function public.reabrir_ordem_producao(uuid, text) from public, anon;
grant execute on function public.reabrir_ordem_producao(uuid, text) to authenticated, service_role;

-- Busca global ganha produto (nome, SKU, código do anúncio) e ordem de produção.
create or replace function public.buscar_global(termo text, tipos text[] default null, limite integer default 8)
returns table (tipo text, id text, titulo text, subtitulo text, rota text, pontuacao real)
language sql stable security invoker
set search_path = public, extensions, pg_temp
as $$
with q as (select app.normalizar(coalesce(termo, '')) as t, websearch_to_tsquery('app.pt', coalesce(termo, '')) as tsq)

select r.tipo, r.id, r.titulo, r.subtitulo, r.rota, r.pontuacao from (
  (select 'canal'::text as tipo, c.id::text as id, c.nome as titulo, c.tipo as subtitulo, '/configuracoes/canais/' || c.id as rota,
          greatest(similarity(app.normalizar(c.nome), q.t), case when app.normalizar(c.nome) like '%' || q.t || '%' then 0.9 else 0 end)::real as pontuacao
     from public.canais_venda c, q
    where (tipos is null or 'canal' = any (tipos)) and char_length(q.t) >= 2
      and (app.normalizar(c.nome) % q.t or app.normalizar(c.nome) like '%' || q.t || '%') order by 6 desc limit limite)
  union all
  (select 'categoria'::text, k.id::text, k.nome, k.escopo, '/configuracoes/categorias?escopo=' || k.escopo || '&destaque=' || k.id,
          greatest(similarity(app.normalizar(k.nome), q.t), case when app.normalizar(k.nome) like '%' || q.t || '%' then 0.9 else 0 end)::real
     from public.categorias k, q
    where (tipos is null or 'categoria' = any (tipos)) and char_length(q.t) >= 2
      and (app.normalizar(k.nome) % q.t or app.normalizar(k.nome) like '%' || q.t || '%') order by 6 desc limit limite)
  union all
  (select 'unidade'::text, u.codigo, u.nome, u.codigo, '/configuracoes/unidades?destaque=' || u.codigo,
          greatest(similarity(app.normalizar(u.nome), q.t), case when app.normalizar(u.nome) like '%' || q.t || '%' or u.codigo = q.t then 0.9 else 0 end)::real
     from public.unidades u, q
    where (tipos is null or 'unidade' = any (tipos)) and char_length(q.t) >= 1
      and (app.normalizar(u.nome) % q.t or app.normalizar(u.nome) like '%' || q.t || '%' or u.codigo = q.t) order by 6 desc limit limite)
  union all
  (select 'conhecimento'::text, n.id::text, n.titulo, n.tipo, '/conhecimento/' || n.id,
          greatest(ts_rank(n.busca, q.tsq) * 2, similarity(app.normalizar(n.titulo), q.t), case when app.normalizar(n.titulo) like '%' || q.t || '%' then 0.9 else 0 end)::real
     from public.conhecimentos n, q
    where (tipos is null or 'conhecimento' = any (tipos)) and char_length(q.t) >= 2 and n.status <> 'arquivado'
      and (n.busca @@ q.tsq or app.normalizar(n.titulo) % q.t or app.normalizar(n.titulo) like '%' || q.t || '%') order by 6 desc limit limite)
  union all
  (select 'insumo'::text, i.id::text, i.nome, i.tipo || case when i.ativo then '' else ' (inativo)' end, '/estoque/insumos/' || i.id,
          greatest(similarity(app.normalizar(i.nome), q.t), case when app.normalizar(i.nome) like '%' || q.t || '%' or lower(coalesce(i.codigo_interno, '')) = q.t then 0.9 else 0 end)::real
     from public.insumos i, q
    where (tipos is null or 'insumo' = any (tipos)) and char_length(q.t) >= 2
      and (app.normalizar(i.nome) % q.t or app.normalizar(i.nome) like '%' || q.t || '%' or lower(coalesce(i.codigo_interno, '')) = q.t) order by 6 desc limit limite)
  union all
  (select 'fornecedor'::text, f.id::text, f.nome, coalesce(f.contato, ''), '/estoque/fornecedores?destaque=' || f.id,
          greatest(similarity(app.normalizar(f.nome), q.t), case when app.normalizar(f.nome) like '%' || q.t || '%' then 0.9 else 0 end)::real
     from public.fornecedores f, q
    where (tipos is null or 'fornecedor' = any (tipos)) and char_length(q.t) >= 2
      and (app.normalizar(f.nome) % q.t or app.normalizar(f.nome) like '%' || q.t || '%') order by 6 desc limit limite)
  union all
  (select 'lote'::text, l.id::text, l.codigo, i.nome, '/estoque/insumos/' || l.insumo_id || '?lote=' || l.id,
          case when app.normalizar(l.codigo) like '%' || q.t || '%' then 0.8 else similarity(app.normalizar(l.codigo), q.t) end::real
     from public.lotes_insumo l join public.insumos i on i.id = l.insumo_id, q
    where (tipos is null or 'lote' = any (tipos)) and char_length(q.t) >= 3
      and (app.normalizar(l.codigo) % q.t or app.normalizar(l.codigo) like '%' || q.t || '%') order by 6 desc limit limite)
  union all
  (select 'compra'::text, c.id::text, coalesce('Compra ' || c.numero_documento, 'Compra de ' || to_char(c.data, 'DD/MM/YYYY')), coalesce(f.nome, c.status), '/estoque/compras/' || c.id,
          0.7::real
     from public.compras c left join public.fornecedores f on f.id = c.fornecedor_id, q
    where (tipos is null or 'compra' = any (tipos)) and char_length(q.t) >= 3
      and (lower(coalesce(c.numero_documento, '')) like '%' || q.t || '%') order by 6 desc limit limite)
  union all
  (select 'impressora'::text, p.id::text, p.nome, coalesce(p.modelo, p.status), '/producao/impressoras?destaque=' || p.id,
          greatest(similarity(app.normalizar(p.nome), q.t), case when app.normalizar(p.nome) like '%' || q.t || '%' then 0.9 else 0 end)::real
     from public.impressoras p, q
    where (tipos is null or 'impressora' = any (tipos)) and char_length(q.t) >= 2
      and (app.normalizar(p.nome) % q.t or app.normalizar(p.nome) like '%' || q.t || '%') order by 6 desc limit limite)
  union all
  (select 'calculo'::text, k.id::text, k.nome, 'Cálculo de custo', '/catalogo/precificacao/historico?destaque=' || k.id,
          greatest(similarity(app.normalizar(k.nome), q.t), case when app.normalizar(k.nome) like '%' || q.t || '%' then 0.9 else 0 end)::real
     from public.calculos_custo k, q
    where (tipos is null or 'calculo' = any (tipos)) and char_length(q.t) >= 2
      and (app.normalizar(k.nome) % q.t or app.normalizar(k.nome) like '%' || q.t || '%') order by 6 desc limit limite)
  union all
  (select 'produto'::text, pr.id::text, pr.nome, coalesce(pr.sku, pr.status), '/catalogo/produtos/' || pr.id,
          greatest(similarity(app.normalizar(pr.nome), q.t), case when app.normalizar(pr.nome) like '%' || q.t || '%' or lower(coalesce(pr.sku, '')) = q.t then 0.9 else 0 end)::real
     from public.produtos pr, q
    where (tipos is null or 'produto' = any (tipos)) and char_length(q.t) >= 2
      and (app.normalizar(pr.nome) % q.t or app.normalizar(pr.nome) like '%' || q.t || '%' or lower(coalesce(pr.sku, '')) = q.t
           or exists (select 1 from public.produtos_anuncios an where an.produto_id = pr.id and an.codigo_externo = q.t))
    order by 6 desc limit limite)
  union all
  (select 'ordem'::text, op.id::text, op.codigo || ' ' || pr.nome, op.status, '/producao/ordens/' || op.id,
          case when lower(op.codigo) like '%' || q.t || '%' then 0.95 else similarity(app.normalizar(pr.nome), q.t) end::real
     from public.ordens_producao op join public.produtos pr on pr.id = op.produto_id, q
    where (tipos is null or 'ordem' = any (tipos)) and char_length(q.t) >= 2
      and (lower(op.codigo) like '%' || q.t || '%' or app.normalizar(pr.nome) % q.t)
    order by 6 desc limit limite)
) r
order by r.pontuacao desc, r.tipo, r.titulo;
$$;
