-- 0009: movimentar_estoque com array_append (text[] || 'literal' era lido como concatenação de arrays),
-- lote conferido contra o insumo, insumo inativo recusado e variável local para o lote de ajuste.

create or replace function public.movimentar_estoque(
  p_insumo uuid, p_tipo text, p_quantidade numeric, p_lote uuid default null, p_motivo text default null,
  p_origem_tipo text default 'manual', p_origem_id uuid default null,
  p_permitir_negativo boolean default false, p_justificativa text default null
) returns jsonb
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_restante numeric;
  v_ativo boolean;
  v_lote record;
  v_lote_id uuid := p_lote;
  v_qtd numeric;
  v_valor numeric;
  v_mov uuid;
  v_movs jsonb := '[]'::jsonb;
  v_alertas text[] := '{}';
  v_custo numeric;
  v_dividido boolean := false;
begin
  -- Ajuste aceita sinal (positivo entra, negativo sai); os demais tipos são sempre saída e exigem quantidade positiva.
  if p_quantidade is null or p_quantidade = 0 then raise exception 'quantidade_invalida'; end if;
  if p_tipo not in ('consumo_producao', 'saida', 'ajuste', 'perda', 'devolucao') then raise exception 'tipo_invalido'; end if;
  if p_tipo <> 'ajuste' and p_quantidade < 0 then raise exception 'quantidade_invalida'; end if;
  if p_origem_tipo not in ('ordem', 'pedido', 'manual') then raise exception 'origem_invalida'; end if;
  select ativo into v_ativo from public.insumos where id = p_insumo for update;
  if not found then raise exception 'insumo_nao_encontrado'; end if;
  if not v_ativo then raise exception 'insumo_inativo'; end if;
  if v_lote_id is not null and not exists (select 1 from public.lotes_insumo where id = v_lote_id and insumo_id = p_insumo) then
    raise exception 'lote_nao_encontrado';
  end if;
  v_restante := abs(p_quantidade);

  -- Ajuste positivo: entra no lote informado ao custo do lote (ou cria lote de ajuste ao custo médio).
  if p_tipo = 'ajuste' and p_quantidade > 0 then
    if v_lote_id is null then
      insert into public.lotes_insumo (insumo_id, codigo, quantidade_inicial, quantidade_atual, valor_atual, custo_unitario, observacoes)
      select p_insumo, 'AJ-' || to_char(now(), 'YYYYMMDD-HH24MISS'), p_quantidade, p_quantidade,
             round(p_quantidade * coalesce(i.custo_medio, 0), 4), coalesce(i.custo_medio, 0), p_motivo
        from public.insumos i where i.id = p_insumo
      returning id, custo_unitario into v_lote_id, v_custo;
    else
      select * into v_lote from public.lotes_insumo where id = v_lote_id for update;
      v_custo := case when v_lote.quantidade_atual > 0 then v_lote.custo_unitario
                      else coalesce((select custo_medio from public.insumos where id = p_insumo), v_lote.custo_unitario, 0) end;
      update public.lotes_insumo
         set quantidade_atual = quantidade_atual + p_quantidade,
             valor_atual = valor_atual + round(p_quantidade * v_custo, 4),
             divergente = case when quantidade_atual + p_quantidade >= 0 then false else divergente end,
             encerrado_em = null
       where id = v_lote_id;
    end if;
    insert into public.movimentacoes_estoque (insumo_id, lote_id, tipo, quantidade, valor, custo_unitario, motivo, justificativa, origem_tipo, origem_id)
    values (p_insumo, v_lote_id, 'ajuste', p_quantidade, round(p_quantidade * v_custo, 4), v_custo, p_motivo, p_justificativa, p_origem_tipo, p_origem_id)
    returning id into v_mov;
    perform app.recalcular_custos_insumo(p_insumo);
    perform app.verificar_estoque_minimo(p_insumo);
    return jsonb_build_object('movimentacoes', jsonb_build_array(v_mov), 'alertas', to_jsonb(v_alertas));
  end if;

  -- Saídas: lote informado primeiro; se faltar, completa com os mais antigos com saldo (PEPS).
  for v_lote in
    select * from public.lotes_insumo
     where insumo_id = p_insumo and (quantidade_atual > 0 or id = v_lote_id)
     order by case when id = v_lote_id then 0 else 1 end, aberto_em
     for update
  loop
    exit when v_restante <= 0;
    if v_lote.quantidade_atual <= 0 then continue; end if;
    if v_lote_id is not null and v_lote.id <> v_lote_id then v_dividido := true; end if;
    v_qtd := least(v_restante, v_lote.quantidade_atual);
    v_valor := case when v_qtd >= v_lote.quantidade_atual then v_lote.valor_atual else round(v_qtd * v_lote.custo_unitario, 4) end;
    update public.lotes_insumo
       set quantidade_atual = quantidade_atual - v_qtd,
           valor_atual = valor_atual - v_valor,
           encerrado_em = case when quantidade_atual - v_qtd <= 0 then now() else encerrado_em end
     where id = v_lote.id;
    insert into public.movimentacoes_estoque (insumo_id, lote_id, tipo, quantidade, valor, custo_unitario, motivo, justificativa, origem_tipo, origem_id)
    values (p_insumo, v_lote.id, p_tipo, -v_qtd, -v_valor, v_lote.custo_unitario, p_motivo, p_justificativa, p_origem_tipo, p_origem_id)
    returning id into v_mov;
    v_movs := v_movs || to_jsonb(v_mov);
    v_restante := v_restante - v_qtd;
  end loop;

  if v_restante > 0 then
    -- Única exceção ao bloqueio: consumo de produção, com lote informado e justificativa. O lote fica divergente e abre alerta crítico.
    if p_tipo = 'consumo_producao' and p_permitir_negativo and v_lote_id is not null and coalesce(p_justificativa, '') <> '' then
      select * into v_lote from public.lotes_insumo where id = v_lote_id for update;
      update public.lotes_insumo
         set quantidade_atual = quantidade_atual - v_restante,
             valor_atual = valor_atual - round(v_restante * custo_unitario, 4),
             divergente = true
       where id = v_lote_id;
      insert into public.movimentacoes_estoque (insumo_id, lote_id, tipo, quantidade, valor, custo_unitario, motivo, justificativa, origem_tipo, origem_id)
      values (p_insumo, v_lote_id, p_tipo, -v_restante, -round(v_restante * v_lote.custo_unitario, 4), v_lote.custo_unitario, p_motivo, p_justificativa, p_origem_tipo, p_origem_id)
      returning id into v_mov;
      v_movs := v_movs || to_jsonb(v_mov);
      insert into public.alertas (tipo, severidade, titulo, descricao, entidade_tipo, entidade_id)
      values ('estoque_negativo', 'critico', 'Lote negativo: ' || v_lote.codigo,
              'Consumo acima do saldo com justificativa: ' || p_justificativa || '. Faça a contagem e registre um ajuste.', 'lote', v_lote_id)
      on conflict do nothing;
      v_alertas := array_append(v_alertas, 'estoque_negativo');
    else
      raise exception 'estoque_insuficiente' using detail = v_restante::text;
    end if;
  end if;

  if v_dividido then
    insert into public.alertas (tipo, severidade, titulo, descricao, entidade_tipo, entidade_id)
    select 'lote_dividido', 'info', 'Consumo dividido entre lotes: ' || i.nome,
           'O lote em uso não tinha saldo suficiente; o restante saiu do lote mais antigo com saldo.', 'insumo', p_insumo
      from public.insumos i where i.id = p_insumo
    on conflict do nothing;
    v_alertas := array_append(v_alertas, 'lote_dividido');
  end if;
  perform app.recalcular_custos_insumo(p_insumo);
  perform app.verificar_estoque_minimo(p_insumo);
  return jsonb_build_object('movimentacoes', v_movs, 'alertas', to_jsonb(v_alertas));
end $$;
