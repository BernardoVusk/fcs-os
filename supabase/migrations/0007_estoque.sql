-- 0007: fornecedores, insumos, compras com rateio, lotes (um rolo = um lote),
-- movimentações imutáveis, custo médio ponderado, estoque mínimo e funções atômicas.

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(nome) between 1 and 120),
  contato text check (char_length(contato) <= 200),
  site text check (char_length(site) <= 200),
  prazo_medio_dias integer check (prazo_medio_dias >= 0),
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger fornecedores_atualizado before update on public.fornecedores for each row execute function app.carimbar_atualizacao();
create trigger fornecedores_auditoria after insert or update or delete on public.fornecedores for each row execute function app.auditar();

create table public.insumos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('filamento', 'embalagem', 'etiqueta', 'caixa', 'componente', 'fixador', 'peca_terceiro', 'consumivel', 'acabamento', 'outro')),
  nome text not null check (char_length(nome) between 1 and 120),
  codigo_interno text unique check (codigo_interno ~ '^[A-Za-z0-9._-]{1,30}$'),
  unidade_base text not null default 'un' references public.unidades (codigo),
  categoria_id uuid references public.categorias (id),
  estoque_minimo numeric(14,3) not null default 0 check (estoque_minimo >= 0),
  localizacao text check (char_length(localizacao) <= 120),
  custo_medio numeric(14,6),
  ultimo_custo numeric(14,6),
  origem_custo text not null default 'media' check (origem_custo in ('media', 'ultima_entrada', 'manual')),
  custo_manual numeric(14,6) check (custo_manual >= 0),
  atributos jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index insumos_busca on public.insumos using gin (app.normalizar(nome) extensions.gin_trgm_ops);
create index insumos_tipo on public.insumos (tipo, ativo);
create trigger insumos_atualizado before update on public.insumos for each row execute function app.carimbar_atualizacao();
create trigger insumos_auditoria after insert or update or delete on public.insumos for each row execute function app.auditar();

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references public.fornecedores (id),
  data date not null default current_date,
  numero_documento text check (char_length(numero_documento) <= 60),
  frete numeric(14,2) not null default 0 check (frete >= 0),
  desconto_total numeric(14,2) not null default 0 check (desconto_total >= 0),
  outros_custos numeric(14,2) not null default 0 check (outros_custos >= 0),
  preco_inclui_frete boolean not null default false,
  metodo_rateio text not null default 'valor' check (metodo_rateio in ('valor', 'quantidade')),
  status text not null default 'rascunho' check (status in ('rascunho', 'confirmada', 'cancelada')),
  confirmada_em timestamptz,
  observacoes text,
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger compras_atualizado before update on public.compras for each row execute function app.carimbar_atualizacao();
create trigger compras_auditoria after insert or update or delete on public.compras for each row execute function app.auditar();

create table public.compras_itens (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras (id) on delete cascade,
  insumo_id uuid not null references public.insumos (id),
  ordem integer not null default 0,
  quantidade numeric(14,3) not null check (quantidade > 0),
  unidade text not null references public.unidades (codigo),
  preco_unitario numeric(14,4) not null check (preco_unitario >= 0),
  desconto_item numeric(14,2) not null default 0 check (desconto_item >= 0),
  peso_util_g numeric(14,3) check (peso_util_g > 0),
  lote_codigo text check (char_length(lote_codigo) <= 40),
  quantidade_base numeric(14,3),
  rateio numeric(14,4),
  custo_total numeric(14,4),
  custo_unitario_final numeric(14,6)
);
create index compras_itens_compra on public.compras_itens (compra_id, ordem);
create index compras_itens_insumo on public.compras_itens (insumo_id);

-- Um rolo é um lote. A verdade é quantidade e valor; custo_unitario é derivado.
create table public.lotes_insumo (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references public.insumos (id),
  compra_item_id uuid references public.compras_itens (id),
  codigo text not null check (char_length(codigo) between 1 and 40),
  quantidade_inicial numeric(14,3) not null check (quantidade_inicial > 0),
  quantidade_atual numeric(14,3) not null,
  valor_atual numeric(14,4) not null default 0,
  custo_unitario numeric(14,6) not null default 0,
  peso_carretel_vazio_g numeric(14,3),
  divergente boolean not null default false,
  aberto_em timestamptz not null default now(),
  encerrado_em timestamptz,
  observacoes text,
  unique (insumo_id, codigo)
);
create index lotes_insumo_saldo on public.lotes_insumo (insumo_id, aberto_em) where quantidade_atual > 0;
create trigger lotes_auditoria after insert or update or delete on public.lotes_insumo for each row execute function app.auditar();

-- Razão imutável. Quantidade e valor com sinal (entrada positiva, saída negativa).
create table public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references public.insumos (id),
  lote_id uuid references public.lotes_insumo (id),
  tipo text not null check (tipo in ('entrada', 'consumo_producao', 'saida', 'ajuste', 'perda', 'devolucao', 'estorno')),
  quantidade numeric(14,3) not null check (quantidade <> 0),
  valor numeric(14,4) not null default 0,
  custo_unitario numeric(14,6) not null default 0,
  motivo text check (char_length(motivo) <= 300),
  justificativa text check (char_length(justificativa) <= 500),
  origem_tipo text check (origem_tipo in ('compra', 'ordem', 'pedido', 'manual', 'estorno')),
  origem_id uuid,
  usuario_id uuid default app.usuario_da_requisicao(),
  em timestamptz not null default now()
);
create index movimentacoes_insumo on public.movimentacoes_estoque (insumo_id, em desc);
create index movimentacoes_lote on public.movimentacoes_estoque (lote_id, em desc);
create index movimentacoes_origem on public.movimentacoes_estoque (origem_tipo, origem_id);

create view public.estoque_atual with (security_invoker = true) as
select i.id as insumo_id, i.nome, i.tipo, i.unidade_base, i.estoque_minimo, i.ativo,
       coalesce(sum(l.quantidade_atual) filter (where l.quantidade_atual > 0), 0) as saldo,
       coalesce(sum(l.valor_atual) filter (where l.quantidade_atual > 0), 0) as valor,
       coalesce(sum(l.quantidade_atual) filter (where l.quantidade_atual < 0), 0) as saldo_negativo,
       count(l.id) filter (where l.quantidade_atual > 0) as lotes_com_saldo,
       i.custo_medio, i.ultimo_custo, i.origem_custo, i.custo_manual,
       coalesce(sum(l.quantidade_atual), 0) < i.estoque_minimo as abaixo_minimo
  from public.insumos i
  left join public.lotes_insumo l on l.insumo_id = i.id
 group by i.id;

alter table public.fornecedores enable row level security;
alter table public.insumos enable row level security;
alter table public.compras enable row level security;
alter table public.compras_itens enable row level security;
alter table public.lotes_insumo enable row level security;
alter table public.movimentacoes_estoque enable row level security;

create policy fornecedores_ler on public.fornecedores for select to authenticated using (app.usuario_ativo());
create policy fornecedores_escrever on public.fornecedores for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy insumos_ler on public.insumos for select to authenticated using (app.usuario_ativo());
create policy insumos_escrever on public.insumos for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy compras_ler on public.compras for select to authenticated using (app.usuario_ativo());
create policy compras_escrever on public.compras for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy compras_itens_ler on public.compras_itens for select to authenticated using (app.usuario_ativo());
create policy compras_itens_escrever on public.compras_itens for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy lotes_ler on public.lotes_insumo for select to authenticated using (app.usuario_ativo());
create policy lotes_inserir on public.lotes_insumo for insert to authenticated with check (app.pode_escrever());
create policy lotes_alterar on public.lotes_insumo for update to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy movimentacoes_ler on public.movimentacoes_estoque for select to authenticated using (app.usuario_ativo());
create policy movimentacoes_inserir on public.movimentacoes_estoque for insert to authenticated with check (app.pode_escrever());

-- Custo médio ponderado (lotes com saldo) e último custo de compra.
create or replace function app.recalcular_custos_insumo(p_insumo uuid) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_qtd numeric;
  v_valor numeric;
  v_ultimo numeric;
begin
  select coalesce(sum(quantidade_atual), 0), coalesce(sum(valor_atual), 0)
    into v_qtd, v_valor
    from public.lotes_insumo where insumo_id = p_insumo and quantidade_atual > 0;
  select l.custo_unitario into v_ultimo
    from public.lotes_insumo l
    join public.compras_itens ci on ci.id = l.compra_item_id
   where l.insumo_id = p_insumo
   order by l.aberto_em desc limit 1;
  update public.insumos
     set custo_medio = case when v_qtd > 0 then round(v_valor / v_qtd, 6) else custo_medio end,
         ultimo_custo = coalesce(v_ultimo, ultimo_custo)
   where id = p_insumo;
end $$;

-- Abre ou resolve o alerta de estoque baixo.
create or replace function app.verificar_estoque_minimo(p_insumo uuid) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_saldo numeric;
  v_min numeric;
  v_nome text;
  v_unidade text;
begin
  select coalesce(sum(l.quantidade_atual), 0), i.estoque_minimo, i.nome, i.unidade_base
    into v_saldo, v_min, v_nome, v_unidade
    from public.insumos i left join public.lotes_insumo l on l.insumo_id = i.id
   where i.id = p_insumo group by i.id;
  if v_min > 0 and v_saldo < v_min then
    insert into public.alertas (tipo, severidade, titulo, descricao, entidade_tipo, entidade_id)
    values ('estoque_baixo', 'atencao', 'Estoque baixo: ' || v_nome,
            'Saldo ' || v_saldo::text || ' ' || v_unidade || ', mínimo ' || v_min::text || ' ' || v_unidade,
            'insumo', p_insumo)
    on conflict do nothing;
  else
    update public.alertas set resolvido_em = now()
     where tipo = 'estoque_baixo' and entidade_tipo = 'insumo' and entidade_id = p_insumo and resolvido_em is null;
  end if;
end $$;

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
    outros_r = round(c.outros_custos * base / v_total_base, 4);
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

-- Saídas, consumo, ajustes, perdas e devoluções com as regras de valoração e de estoque negativo.
create or replace function public.movimentar_estoque(
  p_insumo uuid, p_lote uuid, p_tipo text, p_quantidade numeric, p_motivo text default null,
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

-- Estorno: movimentação oposta no mesmo lote; nada é apagado.
create or replace function public.estornar_movimentacao(p_movimentacao uuid, p_motivo text) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  m record;
  v_id uuid;
begin
  select * into m from public.movimentacoes_estoque where id = p_movimentacao;
  if not found then raise exception 'movimentacao_nao_encontrada'; end if;
  if m.tipo = 'estorno' then raise exception 'estorno_de_estorno'; end if;
  if exists (select 1 from public.movimentacoes_estoque where origem_tipo = 'estorno' and origem_id = p_movimentacao) then raise exception 'ja_estornada'; end if;
  if m.lote_id is not null then
    -- Estornar uma entrada já consumida deixaria o lote negativo: bloqueia.
    if m.quantidade > 0 and exists (select 1 from public.lotes_insumo where id = m.lote_id and quantidade_atual - m.quantidade < 0) then
      raise exception 'estoque_insuficiente';
    end if;
    update public.lotes_insumo set quantidade_atual = quantidade_atual - m.quantidade, valor_atual = valor_atual - m.valor,
           divergente = case when quantidade_atual - m.quantidade >= 0 then false else divergente end,
           encerrado_em = case when quantidade_atual - m.quantidade > 0 then null else coalesce(encerrado_em, now()) end
     where id = m.lote_id;
  end if;
  insert into public.movimentacoes_estoque (insumo_id, lote_id, tipo, quantidade, valor, custo_unitario, motivo, origem_tipo, origem_id)
  values (m.insumo_id, m.lote_id, 'estorno', -m.quantidade, -m.valor, m.custo_unitario, p_motivo, 'estorno', p_movimentacao) returning id into v_id;
  perform app.recalcular_custos_insumo(m.insumo_id);
  perform app.verificar_estoque_minimo(m.insumo_id);
  return v_id;
end $$;

revoke execute on function public.confirmar_compra(uuid) from public, anon;
revoke execute on function public.movimentar_estoque(uuid, uuid, text, numeric, text, text, uuid, boolean, text) from public, anon;
revoke execute on function public.estornar_movimentacao(uuid, text) from public, anon;
grant execute on function public.confirmar_compra(uuid) to authenticated, service_role;
grant execute on function public.movimentar_estoque(uuid, uuid, text, numeric, text, text, uuid, boolean, text) to authenticated, service_role;
grant execute on function public.estornar_movimentacao(uuid, text) to authenticated, service_role;

revoke execute on function app.recalcular_custos_insumo(uuid), app.verificar_estoque_minimo(uuid) from public, anon;
grant execute on function app.recalcular_custos_insumo(uuid), app.verificar_estoque_minimo(uuid) to authenticated, service_role;

create index fornecedores_busca on public.fornecedores using gin (app.normalizar(nome) extensions.gin_trgm_ops);
create index lotes_busca on public.lotes_insumo using gin (app.normalizar(codigo) extensions.gin_trgm_ops);

-- Busca global ganha insumo, fornecedor, lote e compra.
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
) r
order by r.pontuacao desc, r.tipo, r.titulo;
$$;
