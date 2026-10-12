-- 0008: confirmar_compra compatível com safeupdate (UPDATE em tabela temporária precisa de WHERE)
-- e movimentar_estoque com p_lote opcional (parâmetro reordenado para aceitar default null).

-- Confirma a compra: rateia desconto, frete e outros, cria lotes e entradas, atualiza custos.
create or replace function public.confirmar_compra(p_compra uuid) returns jsonb
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  c record;
  it record;
  v_total_base numeric := 0;
  v_base numeric;
  v_frete numeric;
  v_desc numeric;
  v_outros numeric;
  v_soma_frete numeric := 0;
  v_soma_desc numeric := 0;
  v_soma_outros numeric := 0;
  v_maior uuid;
  v_n integer := 0;
  v_landed numeric;
  v_qtd_base numeric;
  v_fator numeric;
  v_rolos integer;
  v_valor_rolo numeric;
  v_valor_rest numeric;
  v_lote uuid;
  v_codigo text;
  v_k integer;
  v_lotes integer := 0;
begin
  select * into c from public.compras where id = p_compra for update;
  if not found then raise exception 'compra_nao_encontrada'; end if;
  if c.status <> 'rascunho' then raise exception 'compra_ja_confirmada'; end if;
  select count(*) into v_n from public.compras_itens where compra_id = p_compra;
  if v_n = 0 then raise exception 'compra_sem_itens'; end if;

  -- Base do rateio por linha: valor (preço x quantidade menos desconto do item) ou quantidade.
  drop table if exists tmp_itens;
  create temp table tmp_itens on commit drop as
  select ci.id, ci.insumo_id, ci.quantidade, ci.unidade, ci.preco_unitario, ci.desconto_item, ci.peso_util_g, ci.lote_codigo, ci.ordem,
         i.tipo, i.unidade_base,
         (ci.quantidade * ci.preco_unitario - ci.desconto_item) as valor_linha,
         case when c.metodo_rateio = 'quantidade' then ci.quantidade else (ci.quantidade * ci.preco_unitario - ci.desconto_item) end as base,
         0::numeric as frete_r, 0::numeric as desc_r, 0::numeric as outros_r
    from public.compras_itens ci join public.insumos i on i.id = ci.insumo_id
   where ci.compra_id = p_compra;
  select sum(base) into v_total_base from tmp_itens;
  if v_total_base <= 0 then raise exception 'compra_sem_valor'; end if;
  v_frete := case when c.preco_inclui_frete then 0 else c.frete end;

  -- Parcelas arredondadas a 4 casas; a linha de maior base absorve o resíduo.
  update tmp_itens set
    frete_r = round(v_frete * base / v_total_base, 4),
    desc_r = round(c.desconto_total * base / v_total_base, 4),
    outros_r = round(c.outros_custos * base / v_total_base, 4)
   where true;
  select sum(frete_r), sum(desc_r), sum(outros_r) into v_soma_frete, v_soma_desc, v_soma_outros from tmp_itens;
  select id into v_maior from tmp_itens order by base desc, ordem limit 1;
  update tmp_itens set
    frete_r = frete_r + (v_frete - v_soma_frete),
    desc_r = desc_r + (c.desconto_total - v_soma_desc),
    outros_r = outros_r + (c.outros_custos - v_soma_outros)
   where id = v_maior;

  for it in select * from tmp_itens order by ordem loop
    v_landed := it.valor_linha - it.desc_r + it.frete_r + it.outros_r;
    -- Quantidade na unidade base do insumo.
    if it.tipo = 'filamento' and it.unidade = 'un' then
      if it.peso_util_g is null then raise exception 'filamento_sem_peso_util'; end if;
      v_qtd_base := it.quantidade * it.peso_util_g;
    else
      select case when u.codigo = it.unidade_base then 1
                  when u.base = it.unidade_base then u.fator_para_base
                  else null end
        into v_fator from public.unidades u where u.codigo = it.unidade;
      if v_fator is null then raise exception 'unidade_incompativel'; end if;
      v_qtd_base := it.quantidade * v_fator;
    end if;
    update public.compras_itens
       set quantidade_base = v_qtd_base, rateio = it.frete_r + it.outros_r - it.desc_r,
           custo_total = round(v_landed, 4), custo_unitario_final = round(v_landed / v_qtd_base, 6)
     where id = it.id;

    -- Filamento em rolos: um lote por rolo, último absorve o resíduo. Outros: um lote por linha.
    if it.tipo = 'filamento' and it.unidade = 'un' and it.quantidade <> trunc(it.quantidade) then raise exception 'rolos_fracionados'; end if;
    v_rolos := case when it.tipo = 'filamento' and it.unidade = 'un' then it.quantidade::integer else 1 end;
    v_valor_rolo := round(v_landed / v_rolos, 4);
    v_valor_rest := v_landed;
    for v_k in 1..v_rolos loop
      v_codigo := coalesce(it.lote_codigo, to_char(c.data, 'YYYYMMDD') || '-' || left(it.id::text, 4)) || case when v_rolos > 1 then '-' || v_k else '' end;
      v_valor_rest := case when v_k = v_rolos then v_valor_rest else v_valor_rest - v_valor_rolo end;
      insert into public.lotes_insumo (insumo_id, compra_item_id, codigo, quantidade_inicial, quantidade_atual, valor_atual, custo_unitario)
      values (it.insumo_id, it.id, v_codigo, v_qtd_base / v_rolos, v_qtd_base / v_rolos,
              case when v_k = v_rolos then round(v_valor_rest, 4) else v_valor_rolo end,
              round(case when v_k = v_rolos then v_valor_rest else v_valor_rolo end / (v_qtd_base / v_rolos), 6))
      returning id into v_lote;
      insert into public.movimentacoes_estoque (insumo_id, lote_id, tipo, quantidade, valor, custo_unitario, motivo, origem_tipo, origem_id)
      select l.insumo_id, l.id, 'entrada', l.quantidade_atual, l.valor_atual, l.custo_unitario, 'Compra ' || coalesce(c.numero_documento, to_char(c.data, 'DD/MM/YYYY')), 'compra', p_compra
        from public.lotes_insumo l where l.id = v_lote;
      v_lotes := v_lotes + 1;
    end loop;
    perform app.recalcular_custos_insumo(it.insumo_id);
    perform app.verificar_estoque_minimo(it.insumo_id);
  end loop;

  update public.compras set status = 'confirmada', confirmada_em = now() where id = p_compra;
  return jsonb_build_object('itens', v_n, 'lotes', v_lotes);
end $$;

drop function public.movimentar_estoque(uuid, uuid, text, numeric, text, text, uuid, boolean, text);
-- Saídas, consumo, ajustes, perdas e devoluções com as regras de valoração e de estoque negativo.
create or replace function public.movimentar_estoque(
  p_insumo uuid, p_tipo text, p_quantidade numeric, p_lote uuid default null, p_motivo text default null,
  p_origem_tipo text default 'manual', p_origem_id uuid default null,
  p_permitir_negativo boolean default false, p_justificativa text default null
) returns jsonb
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_restante numeric;
  v_lote record;
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
  perform 1 from public.insumos where id = p_insumo for update;
  if not found then raise exception 'insumo_nao_encontrado'; end if;
  v_restante := abs(p_quantidade);

  if p_tipo = 'ajuste' and p_quantidade > 0 then
    if p_lote is null then
      insert into public.lotes_insumo (insumo_id, codigo, quantidade_inicial, quantidade_atual, valor_atual, custo_unitario, observacoes)
      select p_insumo, 'AJ-' || to_char(now(), 'YYYYMMDD-HH24MI'), p_quantidade, p_quantidade, round(p_quantidade * coalesce(i.custo_medio, 0), 4), coalesce(i.custo_medio, 0), p_motivo
        from public.insumos i where i.id = p_insumo returning id into p_lote;
      select * into v_lote from public.lotes_insumo where id = p_lote;
      v_custo := v_lote.custo_unitario;
    else
      select * into v_lote from public.lotes_insumo where id = p_lote and insumo_id = p_insumo for update;
      if not found then raise exception 'lote_nao_encontrado'; end if;
      v_custo := case when v_lote.quantidade_atual > 0 then v_lote.custo_unitario else coalesce((select custo_medio from public.insumos where id = p_insumo), 0) end;
      update public.lotes_insumo set quantidade_atual = quantidade_atual + p_quantidade, valor_atual = valor_atual + round(p_quantidade * v_custo, 4), encerrado_em = null where id = p_lote;
    end if;
    insert into public.movimentacoes_estoque (insumo_id, lote_id, tipo, quantidade, valor, custo_unitario, motivo, justificativa, origem_tipo, origem_id)
    values (p_insumo, p_lote, 'ajuste', p_quantidade, round(p_quantidade * v_custo, 4), v_custo, p_motivo, p_justificativa, 'manual', p_origem_id) returning id into v_mov;
    perform app.recalcular_custos_insumo(p_insumo);
    perform app.verificar_estoque_minimo(p_insumo);
    return jsonb_build_object('movimentacoes', jsonb_build_array(v_mov), 'alertas', to_jsonb(v_alertas));
  end if;

  -- Saídas: lote informado primeiro; se faltar, completa com os mais antigos com saldo (PEPS).
  for v_lote in
    select * from public.lotes_insumo
     where insumo_id = p_insumo and (quantidade_atual > 0 or id = p_lote)
     order by case when id = p_lote then 0 else 1 end, aberto_em
     for update
  loop
    exit when v_restante <= 0;
    if v_lote.id <> p_lote and p_lote is not null then v_dividido := true; end if;
    if v_lote.quantidade_atual <= 0 then continue; end if;
    v_qtd := least(v_restante, v_lote.quantidade_atual);
    v_valor := case when v_qtd >= v_lote.quantidade_atual then v_lote.valor_atual else round(v_qtd * v_lote.custo_unitario, 4) end;
    update public.lotes_insumo
       set quantidade_atual = quantidade_atual - v_qtd,
           valor_atual = valor_atual - v_valor,
           encerrado_em = case when quantidade_atual - v_qtd <= 0 then now() else encerrado_em end
     where id = v_lote.id;
    insert into public.movimentacoes_estoque (insumo_id, lote_id, tipo, quantidade, valor, custo_unitario, motivo, justificativa, origem_tipo, origem_id)
    values (p_insumo, v_lote.id, p_tipo, -v_qtd, -v_valor, v_lote.custo_unitario, p_motivo, p_justificativa, p_origem_tipo, p_origem_id) returning id into v_mov;
    v_movs := v_movs || to_jsonb(v_mov);
    v_restante := v_restante - v_qtd;
  end loop;

  if v_restante > 0 then
    if p_tipo = 'consumo_producao' and p_permitir_negativo and p_lote is not null and coalesce(p_justificativa, '') <> '' then
      select * into v_lote from public.lotes_insumo where id = p_lote for update;
      update public.lotes_insumo set quantidade_atual = quantidade_atual - v_restante, valor_atual = valor_atual - round(v_restante * custo_unitario, 4), divergente = true where id = p_lote;
      insert into public.movimentacoes_estoque (insumo_id, lote_id, tipo, quantidade, valor, custo_unitario, motivo, justificativa, origem_tipo, origem_id)
      values (p_insumo, p_lote, p_tipo, -v_restante, -round(v_restante * v_lote.custo_unitario, 4), v_lote.custo_unitario, p_motivo, p_justificativa, p_origem_tipo, p_origem_id) returning id into v_mov;
      v_movs := v_movs || to_jsonb(v_mov);
      insert into public.alertas (tipo, severidade, titulo, descricao, entidade_tipo, entidade_id)
      values ('estoque_negativo', 'critico', 'Lote negativo: ' || v_lote.codigo, 'Consumo acima do saldo com justificativa: ' || p_justificativa || '. Faça a contagem e ajuste.', 'lote', p_lote)
      on conflict do nothing;
      v_alertas := v_alertas || 'estoque_negativo';
    else
      raise exception 'estoque_insuficiente' using detail = v_restante::text;
    end if;
  end if;

  if v_dividido then
    insert into public.alertas (tipo, severidade, titulo, descricao, entidade_tipo, entidade_id)
    select 'lote_dividido', 'info', 'Consumo dividido entre lotes: ' || i.nome, 'O lote em uso não tinha saldo suficiente; o restante saiu do lote mais antigo.', 'insumo', p_insumo
      from public.insumos i where i.id = p_insumo on conflict do nothing;
    v_alertas := v_alertas || 'lote_dividido';
  end if;
  perform app.recalcular_custos_insumo(p_insumo);
  perform app.verificar_estoque_minimo(p_insumo);
  return jsonb_build_object('movimentacoes', v_movs, 'alertas', to_jsonb(v_alertas));
end $$;

revoke execute on function public.movimentar_estoque(uuid, text, numeric, uuid, text, text, uuid, boolean, text) from public, anon;
grant execute on function public.movimentar_estoque(uuid, text, numeric, uuid, text, text, uuid, boolean, text) to authenticated, service_role;
