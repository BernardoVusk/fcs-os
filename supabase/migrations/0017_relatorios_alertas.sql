-- Fase 9: views dos relatórios, geração de alertas e política para resolver ou silenciar alertas.

-- Itens de pedidos pagos (rentabilidade por produto).
create view public.rel_vendas_itens with (security_invoker = true) as
select pi.pedido_id, pe.codigo as pedido_codigo, pe.data_pagamento, pe.canal_id, cv.nome as canal_nome,
       pi.produto_id, coalesce(pr.nome, pi.titulo) as produto_nome, pi.variacao_id, pi.quantidade,
       round(pi.quantidade * pi.preco_unitario - pi.desconto, 2) as receita,
       pi.custo_unitario_estimado as custo_estimado, pi.custo_unitario_realizado as custo_realizado
  from public.pedidos_itens pi
  join public.pedidos pe on pe.id = pi.pedido_id
  join public.canais_venda cv on cv.id = pe.canal_id
  left join public.produtos pr on pr.id = pi.produto_id
 where pe.status_pagamento = 'pago' and pe.data_pagamento is not null;

-- Resumo dos pedidos pagos (rentabilidade por canal e por pedido).
create view public.rel_pedidos_pagos with (security_invoker = true) as
select pe.id as pedido_id, pe.codigo, pe.data_pagamento, pe.canal_id, cv.nome as canal_nome,
       (pe.resumo->>'receita_bruta')::numeric as receita_bruta,
       (pe.resumo->>'base_vendas')::numeric as base_vendas,
       (pe.resumo->>'taxas_canal')::numeric as taxas_canal,
       (pe.resumo->>'valor_a_receber')::numeric as valor_a_receber,
       (pe.resumo->>'imposto_estimado')::numeric as imposto_estimado,
       (pe.resumo->>'receita_liquida')::numeric as receita_liquida,
       (pe.resumo->>'custo_estimado')::numeric as custo_estimado,
       (pe.resumo->>'custo_realizado')::numeric as custo_realizado,
       (pe.resumo->>'resultado_estimado')::numeric as resultado_estimado,
       (pe.resumo->>'resultado_real')::numeric as resultado_real
  from public.pedidos pe
  join public.canais_venda cv on cv.id = pe.canal_id
 where pe.status_pagamento = 'pago' and pe.data_pagamento is not null;

-- Ordens concluídas (custo real x estimado e desempenho de impressoras).
create view public.rel_ordens_concluidas with (security_invoker = true) as
select o.id as ordem_id, o.codigo, o.fim_real, o.produto_id, pr.nome as produto_nome,
       o.impressora_id, im.nome as impressora_nome,
       o.quantidade_aprovada, o.quantidade_perdida, o.tempo_previsto_min, o.tempo_real_min,
       o.custo_estimado, o.custo_realizado
  from public.ordens_producao o
  join public.produtos pr on pr.id = o.produto_id
  left join public.impressoras im on im.id = o.impressora_id
 where o.status = 'concluida' and o.fim_real is not null;

-- Consumo de filamento por mês e insumo (só consumo de produção).
create view public.rel_consumo_mensal with (security_invoker = true) as
select to_char(m.em at time zone 'America/Sao_Paulo', 'YYYY-MM') as mes, m.insumo_id, i.nome as insumo_nome,
       sum(abs(m.quantidade)) as quantidade_g, sum(abs(m.valor)) as valor
  from public.movimentacoes_estoque m
  join public.insumos i on i.id = m.insumo_id
 where m.tipo = 'consumo_producao' and i.tipo = 'filamento'
 group by 1, 2, 3;

grant select on public.rel_vendas_itens, public.rel_pedidos_pagos, public.rel_ordens_concluidas, public.rel_consumo_mensal to authenticated, service_role;

-- Resolver e silenciar alertas pela tela.
drop policy if exists alertas_alterar on public.alertas;
create policy alertas_alterar on public.alertas for update to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create index alertas_abertos on public.alertas (severidade, criado_em desc) where resolvido_em is null;
create index auditoria_usuario on public.auditoria (usuario_id, em desc);

-- Geração diária (idempotente): abre o que passou a valer, atualiza o título do que mudou e resolve o que deixou de valer.
create or replace function public.gerar_alertas() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_abertos integer := 0;
  v_atualizados integer := 0;
  v_resolvidos integer := 0;
  v_vencidos integer;
begin
  if auth.uid() is not null and not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  create temp table alvo (tipo text, severidade text, titulo text, descricao text, entidade_tipo text, entidade_id uuid) on commit drop;

  insert into alvo
  select 'prazo_vencido', case when pi.prioridade = 'alta' then 'critico' else 'atencao' end,
         'Prazo vencido: ' || pi.titulo, 'Prazo ' || to_char(pi.prazo, 'DD/MM/YYYY') || ', status ' || f.nome, 'item_plano', pi.id
    from public.plan_itens pi join public.plan_fluxos f on f.tipo = pi.tipo and f.codigo = pi.status
   where pi.prazo < v_hoje and not f.fechado;

  insert into alvo
  select 'ordem_atrasada', 'atencao', 'Ordem atrasada: ' || o.codigo || ' (' || pr.nome || ')',
         'Prazo ' || to_char(o.prazo, 'DD/MM/YYYY') || ', situação ' || o.status, 'ordem', o.id
    from public.ordens_producao o join public.produtos pr on pr.id = o.produto_id
   where o.prazo < v_hoje and o.status in ('fila', 'imprimindo', 'acabamento');

  insert into alvo
  select 'pedido_parado', 'atencao', 'Pedido pago sem envio há ' || (v_hoje - pe.data_pagamento) || ' dias: ' || pe.codigo,
         'Pago em ' || to_char(pe.data_pagamento, 'DD/MM/YYYY') || ', status ' || st.nome, 'pedido', pe.id
    from public.pedidos pe join public.pedidos_status st on st.id = pe.status_id
   where pe.status_pagamento = 'pago' and pe.data_pagamento < v_hoje - 5 and not st.fechado and not st.baixa_estoque;

  select count(*) into v_vencidos from public.lancamentos l
   where l.cancelado_em is null and l.estornado_em is null and l.encerrado_em is null and l.data_prevista < v_hoje
     and l.valor_previsto - coalesce((select sum(valor) from public.lancamentos_realizacoes r where r.lancamento_id = l.id), 0) > 0.005;
  if v_vencidos > 0 then
    insert into alvo values ('lancamento_vencido', 'atencao', v_vencidos || ' lançamento(s) vencido(s) no financeiro', 'Abra Financeiro > Lançamentos > Vencidos.', 'financeiro', null);
  end if;

  insert into alvo
  select 'manutencao_prevista', 'atencao', 'Manutenção prevista: ' || im.nome,
         'Horas de uso ' || round(im.horas_uso) || ', próxima manutenção em ' || m.proxima_em_horas || ' h', 'impressora', im.id
    from public.impressoras im
    join lateral (select proxima_em_horas from public.manutencoes mm where mm.impressora_id = im.id order by mm.data desc, mm.criado_em desc limit 1) m on true
   where im.status = 'ativa' and m.proxima_em_horas is not null and im.horas_uso >= m.proxima_em_horas;

  insert into public.alertas (tipo, severidade, titulo, descricao, entidade_tipo, entidade_id)
  select a.tipo, a.severidade, a.titulo, a.descricao, a.entidade_tipo, a.entidade_id from alvo a
   where not exists (select 1 from public.alertas x where x.tipo = a.tipo and x.entidade_tipo is not distinct from a.entidade_tipo and x.entidade_id is not distinct from a.entidade_id and x.resolvido_em is null);
  get diagnostics v_abertos = row_count;

  update public.alertas x set titulo = a.titulo, descricao = a.descricao, severidade = a.severidade
    from alvo a
   where x.tipo = a.tipo and x.entidade_tipo is not distinct from a.entidade_tipo and x.entidade_id is not distinct from a.entidade_id and x.resolvido_em is null
     and (x.titulo <> a.titulo or x.descricao is distinct from a.descricao or x.severidade <> a.severidade);
  get diagnostics v_atualizados = row_count;

  update public.alertas x set resolvido_em = now()
   where x.resolvido_em is null and x.tipo in ('prazo_vencido', 'ordem_atrasada', 'pedido_parado', 'lancamento_vencido', 'manutencao_prevista')
     and not exists (select 1 from alvo a where a.tipo = x.tipo and a.entidade_tipo is not distinct from x.entidade_tipo and a.entidade_id is not distinct from x.entidade_id);
  get diagnostics v_resolvidos = row_count;

  return jsonb_build_object('abertos', v_abertos, 'atualizados', v_atualizados, 'resolvidos', v_resolvidos, 'em', now());
end $$;
revoke execute on function public.gerar_alertas() from public, anon;
grant execute on function public.gerar_alertas() to authenticated, service_role;
