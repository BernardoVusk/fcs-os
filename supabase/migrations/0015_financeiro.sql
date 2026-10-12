-- 0015: financeiro. Contas, categorias (embutido_no_custo), centros de custo, recorrências, lançamentos com
-- realizações parciais, estorno por contra-lançamento, parâmetros tributários e provisões. Recebível nasce por
-- gatilho quando o pedido é marcado pago; pagável nasce ao confirmar compra e ao registrar manutenção com custo.
-- Só o dono lê e escreve o financeiro (RLS); os gatilhos são security definer para o operador não travar.

create table public.contas_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(nome) between 1 and 80),
  tipo text not null check (tipo in ('banco', 'carteira', 'saldo_marketplace', 'cartao')),
  canal_id uuid references public.canais_venda (id),
  saldo_inicial numeric(14,2) not null default 0,
  saldo_inicial_em date not null default current_date,
  ativo boolean not null default true,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger contas_atualizado before update on public.contas_financeiras for each row execute function app.carimbar_atualizacao();
create trigger contas_auditoria after insert or update or delete on public.contas_financeiras for each row execute function app.auditar();

create table public.categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 80),
  tipo text not null check (tipo in ('receita', 'despesa')),
  natureza text not null default 'variavel' check (natureza in ('fixa', 'variavel')),
  embutido_no_custo boolean not null default false,
  pai_id uuid references public.categorias_financeiras (id),
  ordem integer not null default 0,
  ativo boolean not null default true,
  unique (tipo, nome)
);
create trigger categorias_fin_auditoria after insert or update or delete on public.categorias_financeiras for each row execute function app.auditar();
insert into public.categorias_financeiras (nome, tipo, natureza, embutido_no_custo, ordem) values
  ('Vendas', 'receita', 'variavel', false, 10),
  ('Outras receitas', 'receita', 'variavel', false, 20),
  ('Insumos', 'despesa', 'variavel', true, 10),
  ('Energia', 'despesa', 'variavel', true, 20),
  ('Manutenção de impressora', 'despesa', 'variavel', true, 30),
  ('Equipamentos', 'despesa', 'fixa', false, 40),
  ('Taxas de canal', 'despesa', 'variavel', false, 50),
  ('Frete', 'despesa', 'variavel', false, 60),
  ('Reembolsos', 'despesa', 'variavel', false, 65),
  ('Impostos', 'despesa', 'variavel', false, 70),
  ('Marketing e anúncios', 'despesa', 'variavel', false, 80),
  ('Software e assinaturas', 'despesa', 'fixa', false, 90),
  ('Pró-labore', 'despesa', 'fixa', false, 100),
  ('Outras despesas', 'despesa', 'variavel', false, 110);

create table public.centros_custo (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(nome) between 1 and 80),
  ativo boolean not null default true
);

create table public.recorrencias (
  id uuid primary key default gen_random_uuid(),
  descricao text not null check (char_length(descricao) between 1 and 160),
  tipo text not null check (tipo in ('receita', 'despesa')),
  categoria_id uuid references public.categorias_financeiras (id),
  conta_id uuid references public.contas_financeiras (id),
  centro_custo_id uuid references public.centros_custo (id),
  valor numeric(14,2) not null check (valor > 0),
  frequencia text not null check (frequencia in ('semanal', 'mensal', 'anual')),
  dia integer check (dia between 1 and 31),
  inicio date not null,
  fim date,
  ativo boolean not null default true,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger recorrencias_atualizado before update on public.recorrencias for each row execute function app.carimbar_atualizacao();
create trigger recorrencias_auditoria after insert or update or delete on public.recorrencias for each row execute function app.auditar();

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('receita', 'despesa', 'transferencia')),
  descricao text not null check (char_length(descricao) between 1 and 200),
  categoria_id uuid references public.categorias_financeiras (id),
  centro_custo_id uuid references public.centros_custo (id),
  conta_id uuid references public.contas_financeiras (id),
  conta_destino_id uuid references public.contas_financeiras (id),
  valor_previsto numeric(14,2) not null check (valor_previsto > 0),
  competencia date not null,
  data_prevista date not null,
  cancelado_em timestamptz,
  cancelado_motivo text,
  encerrado_em timestamptz,
  encerrado_motivo text,
  estornado_em timestamptz,
  estorna_id uuid references public.lancamentos (id),
  forma_pagamento text check (char_length(forma_pagamento) <= 40),
  recorrencia_id uuid references public.recorrencias (id) on delete set null,
  origem_tipo text check (origem_tipo in ('pedido', 'reembolso_pedido', 'compra', 'manutencao', 'imposto', 'recorrencia', 'manual', 'estorno')),
  origem_id uuid,
  papel_origem text not null default 'principal',
  anexo_path text,
  observacoes text,
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (tipo <> 'transferencia' or (conta_id is not null and conta_destino_id is not null and conta_id <> conta_destino_id))
);
create unique index lancamentos_origem_unica on public.lancamentos (origem_tipo, origem_id, papel_origem) where origem_id is not null;
create unique index lancamentos_recorrencia_competencia on public.lancamentos (recorrencia_id, competencia) where recorrencia_id is not null;
create index lancamentos_data on public.lancamentos (data_prevista);
create index lancamentos_competencia on public.lancamentos (competencia);
create index lancamentos_busca on public.lancamentos using gin (app.normalizar(descricao) extensions.gin_trgm_ops);
create trigger lancamentos_atualizado before update on public.lancamentos for each row execute function app.carimbar_atualizacao();
create trigger lancamentos_auditoria after insert or update or delete on public.lancamentos for each row execute function app.auditar();

create table public.lancamentos_realizacoes (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null references public.lancamentos (id) on delete cascade,
  valor numeric(14,2) not null check (valor > 0),
  data date not null default current_date,
  conta_id uuid not null references public.contas_financeiras (id),
  observacao text,
  usuario_id uuid default app.usuario_da_requisicao(),
  em timestamptz not null default now()
);
create index realizacoes_lancamento on public.lancamentos_realizacoes (lancamento_id);
create index realizacoes_data on public.lancamentos_realizacoes (data);

create table public.parametros_tributarios (
  id uuid primary key default gen_random_uuid(),
  regime text not null check (char_length(regime) between 1 and 80),
  aliquota_efetiva_pct numeric(7,6) not null check (aliquota_efetiva_pct >= 0 and aliquota_efetiva_pct < 1),
  base text not null default 'faturamento_bruto' check (base in ('faturamento_bruto', 'receita_liquida')),
  dia_vencimento integer not null default 20 check (dia_vencimento between 1 and 28),
  vigente_desde date not null default current_date,
  observacoes text,
  criado_em timestamptz not null default now()
);
create trigger tributos_auditoria after insert or update or delete on public.parametros_tributarios for each row execute function app.auditar();

create table public.provisoes_imposto (
  id uuid primary key default gen_random_uuid(),
  competencia date not null unique,
  base_calculo numeric(14,2) not null default 0,
  aliquota numeric(7,6) not null,
  valor numeric(14,2) not null default 0,
  lancamento_id uuid references public.lancamentos (id),
  atualizado_em timestamptz not null default now()
);

-- Situação derivada de cada lançamento.
create view public.lancamentos_situacao with (security_invoker = true) as
select l.*,
       coalesce(r.total, 0) as valor_realizado,
       greatest(l.valor_previsto - coalesce(r.total, 0), 0) as saldo_restante,
       case when l.estornado_em is not null then 'estornado'
            when l.cancelado_em is not null then 'cancelado'
            when l.encerrado_em is not null or coalesce(r.total, 0) + 0.005 >= l.valor_previsto then 'realizado'
            when coalesce(r.total, 0) > 0 then 'parcial'
            else 'planejado' end as estado,
       (l.cancelado_em is null and l.estornado_em is null and l.encerrado_em is null and coalesce(r.total, 0) + 0.005 < l.valor_previsto and l.data_prevista < current_date) as atrasado,
       r.ultima_data,
       c.nome as categoria_nome, c.natureza as categoria_natureza, c.embutido_no_custo,
       ct.nome as conta_nome
  from public.lancamentos l
  left join (select lancamento_id, sum(valor) as total, max(data) as ultima_data from public.lancamentos_realizacoes group by lancamento_id) r on r.lancamento_id = l.id
  left join public.categorias_financeiras c on c.id = l.categoria_id
  left join public.contas_financeiras ct on ct.id = l.conta_id;

-- Saldo por conta: inicial mais realizações (receita entra, despesa sai, transferência sai da origem e entra no destino).
create view public.contas_saldos with (security_invoker = true) as
select c.id, c.nome, c.tipo, c.ativo, c.saldo_inicial,
       c.saldo_inicial + coalesce((
         select sum(case when l.tipo = 'receita' then r.valor when l.tipo = 'despesa' then -r.valor when r.conta_id = c.id then -r.valor else r.valor end)
           from public.lancamentos_realizacoes r join public.lancamentos l on l.id = r.lancamento_id
          where r.conta_id = c.id or (l.tipo = 'transferencia' and l.conta_destino_id = c.id and r.conta_id <> c.id)
       ), 0) as saldo_atual
  from public.contas_financeiras c;

alter table public.contas_financeiras enable row level security;
alter table public.categorias_financeiras enable row level security;
alter table public.centros_custo enable row level security;
alter table public.recorrencias enable row level security;
alter table public.lancamentos enable row level security;
alter table public.lancamentos_realizacoes enable row level security;
alter table public.parametros_tributarios enable row level security;
alter table public.provisoes_imposto enable row level security;
create policy contas_dono on public.contas_financeiras for all to authenticated using (app.eh_dono()) with check (app.eh_dono());
create policy categorias_fin_dono on public.categorias_financeiras for all to authenticated using (app.eh_dono()) with check (app.eh_dono());
create policy centros_dono on public.centros_custo for all to authenticated using (app.eh_dono()) with check (app.eh_dono());
create policy recorrencias_dono on public.recorrencias for all to authenticated using (app.eh_dono()) with check (app.eh_dono());
create policy lancamentos_ler on public.lancamentos for select to authenticated using (app.eh_dono());
create policy lancamentos_inserir on public.lancamentos for insert to authenticated with check (app.eh_dono());
create policy lancamentos_alterar on public.lancamentos for update to authenticated using (app.eh_dono()) with check (app.eh_dono());
create policy realizacoes_ler on public.lancamentos_realizacoes for select to authenticated using (app.eh_dono());
create policy realizacoes_inserir on public.lancamentos_realizacoes for insert to authenticated with check (app.eh_dono());
create policy tributos_dono on public.parametros_tributarios for all to authenticated using (app.eh_dono()) with check (app.eh_dono());
create policy provisoes_dono on public.provisoes_imposto for all to authenticated using (app.eh_dono()) with check (app.eh_dono());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
create policy comprovantes_ler on storage.objects for select to authenticated using (bucket_id = 'comprovantes' and app.eh_dono());
create policy comprovantes_inserir on storage.objects for insert to authenticated with check (bucket_id = 'comprovantes' and app.eh_dono());
create policy comprovantes_apagar on storage.objects for delete to authenticated using (bucket_id = 'comprovantes' and app.eh_dono());

-- Realiza (parcial ou total). p_encerrar fecha com diferença justificada.
create or replace function public.realizar_lancamento(p_lancamento uuid, p_valor numeric, p_conta uuid, p_data date default current_date, p_observacao text default null, p_encerrar boolean default false, p_motivo text default null) returns jsonb
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  l record;
  v_realizado numeric;
  v_restante numeric;
begin
  select * into l from public.lancamentos where id = p_lancamento for update;
  if not found then raise exception 'lancamento_nao_encontrado'; end if;
  if l.cancelado_em is not null or l.estornado_em is not null or l.encerrado_em is not null then raise exception 'lancamento_nao_aberto'; end if;
  select coalesce(sum(valor), 0) into v_realizado from public.lancamentos_realizacoes where lancamento_id = p_lancamento;
  v_restante := l.valor_previsto - v_realizado;
  if v_restante <= 0.005 then raise exception 'lancamento_nao_aberto'; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'valor_invalido'; end if;
  if p_valor - 0.005 > v_restante then raise exception 'valor_acima_do_restante'; end if;
  if p_conta is null then raise exception 'conta_obrigatoria'; end if;
  insert into public.lancamentos_realizacoes (lancamento_id, valor, data, conta_id, observacao) values (p_lancamento, p_valor, coalesce(p_data, current_date), p_conta, p_observacao);
  if l.conta_id is null then update public.lancamentos set conta_id = p_conta where id = p_lancamento; end if;
  if p_encerrar and p_valor + 0.005 < v_restante then
    if coalesce(p_motivo, '') = '' then raise exception 'motivo_obrigatorio'; end if;
    update public.lancamentos set encerrado_em = now(), encerrado_motivo = p_motivo where id = p_lancamento;
  end if;
  return jsonb_build_object('realizado', v_realizado + p_valor, 'restante', greatest(v_restante - p_valor, 0));
end $$;

create or replace function public.cancelar_lancamento(p_lancamento uuid, p_motivo text) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  l record;
  v_realizado numeric;
begin
  select * into l from public.lancamentos where id = p_lancamento for update;
  if not found then raise exception 'lancamento_nao_encontrado'; end if;
  select coalesce(sum(valor), 0) into v_realizado from public.lancamentos_realizacoes where lancamento_id = p_lancamento;
  if l.cancelado_em is not null or l.estornado_em is not null or l.encerrado_em is not null or v_realizado > 0 then raise exception 'lancamento_nao_cancelavel'; end if;
  update public.lancamentos set cancelado_em = now(), cancelado_motivo = p_motivo where id = p_lancamento;
end $$;

-- Estorno: contra-lançamento de direção oposta, realizado na hora nas mesmas contas. O original fica como estornado.
create or replace function public.estornar_lancamento(p_lancamento uuid, p_motivo text) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  l record;
  r record;
  v_realizado numeric;
  v_novo uuid;
begin
  select * into l from public.lancamentos where id = p_lancamento for update;
  if not found then raise exception 'lancamento_nao_encontrado'; end if;
  if l.estornado_em is not null or l.cancelado_em is not null then raise exception 'lancamento_nao_estornavel'; end if;
  select coalesce(sum(valor), 0) into v_realizado from public.lancamentos_realizacoes where lancamento_id = p_lancamento;
  if l.encerrado_em is null and v_realizado + 0.005 < l.valor_previsto then raise exception 'lancamento_nao_estornavel'; end if;
  insert into public.lancamentos (tipo, descricao, categoria_id, centro_custo_id, conta_id, conta_destino_id, valor_previsto, competencia, data_prevista, origem_tipo, origem_id, papel_origem, estorna_id, observacoes)
  values (case l.tipo when 'receita' then 'despesa' when 'despesa' then 'receita' else 'transferencia' end,
          'Estorno: ' || l.descricao, l.categoria_id, l.centro_custo_id,
          case when l.tipo = 'transferencia' then l.conta_destino_id else l.conta_id end,
          case when l.tipo = 'transferencia' then l.conta_id else null end,
          v_realizado, l.competencia, current_date, 'estorno', p_lancamento, 'principal', p_lancamento, p_motivo)
  returning id into v_novo;
  for r in select * from public.lancamentos_realizacoes where lancamento_id = p_lancamento loop
    insert into public.lancamentos_realizacoes (lancamento_id, valor, data, conta_id, observacao)
    values (v_novo, r.valor, current_date, case when l.tipo = 'transferencia' then coalesce(l.conta_destino_id, r.conta_id) else r.conta_id end, 'Estorno');
  end loop;
  update public.lancamentos set estornado_em = now() where id = p_lancamento;
  return v_novo;
end $$;

-- Recebível do pedido: um só por pedido; valor = valor a receber do resumo; data = pagamento + dias de repasse do canal.
create or replace function public.garantir_recebivel(p_pedido uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  p record;
  v_valor numeric;
  v_dias integer;
  v_conta uuid;
  v_categoria uuid;
  v_id uuid;
  v_realizado numeric;
begin
  select pe.*, cv.nome as canal_nome into p from public.pedidos pe join public.canais_venda cv on cv.id = pe.canal_id where pe.id = p_pedido;
  if not found then return null; end if;
  v_valor := (p.resumo->>'valor_a_receber')::numeric;
  if v_valor is null or v_valor <= 0 then return null; end if;
  select dias_repasse into v_dias from public.canais_venda_vigentes where id = p.canal_id;
  select id into v_conta from public.contas_financeiras where canal_id = p.canal_id and ativo order by criado_em limit 1;
  select id into v_categoria from public.categorias_financeiras where tipo = 'receita' and nome = 'Vendas';
  select id into v_id from public.lancamentos where origem_tipo = 'pedido' and origem_id = p_pedido and papel_origem = 'principal';
  if v_id is not null then
    select coalesce(sum(valor), 0) into v_realizado from public.lancamentos_realizacoes where lancamento_id = v_id;
    update public.lancamentos set valor_previsto = v_valor where id = v_id and v_realizado = 0 and cancelado_em is null and estornado_em is null and encerrado_em is null and valor_previsto <> v_valor;
    return v_id;
  end if;
  insert into public.lancamentos (tipo, descricao, categoria_id, conta_id, valor_previsto, competencia, data_prevista, origem_tipo, origem_id, papel_origem, observacoes)
  values ('receita', 'Pedido ' || p.codigo || ' (' || p.canal_nome || ')', v_categoria, v_conta, v_valor, date_trunc('month', p.data_pedido)::date,
          coalesce(p.data_pagamento, current_date) + coalesce(v_dias, 0), 'pedido', p_pedido, 'principal',
          case when v_dias is null then 'Canal sem dias de repasse configurados: data prevista igual ao pagamento.' else null end)
  returning id into v_id;
  return v_id;
end $$;

-- Gatilho em pedidos: pago gera o recebível; resumo novo atualiza o previsto enquanto planejado; cancelado cancela o recebível planejado.
create or replace function app.gancho_financeiro_pedido() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_realizado numeric;
  v_status text;
begin
  if new.status_pagamento = 'pago' then perform public.garantir_recebivel(new.id); end if;
  select codigo into v_status from public.pedidos_status where id = new.status_id;
  if v_status = 'cancelado' then
    select id into v_id from public.lancamentos where origem_tipo = 'pedido' and origem_id = new.id and papel_origem = 'principal' and cancelado_em is null and estornado_em is null;
    if v_id is not null then
      select coalesce(sum(valor), 0) into v_realizado from public.lancamentos_realizacoes where lancamento_id = v_id;
      if v_realizado = 0 then update public.lancamentos set cancelado_em = now(), cancelado_motivo = 'Pedido cancelado' where id = v_id; end if;
    end if;
  end if;
  return new;
end $$;
create trigger pedidos_financeiro after update of status_pagamento, status_id, resumo on public.pedidos for each row execute function app.gancho_financeiro_pedido();

-- Devolução com repasse já recebido vira pagável de reembolso (nunca edita o recebível).
create or replace function app.gancho_reembolso_pedido() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_realizado numeric;
  v_categoria uuid;
  v_codigo text;
begin
  if new.tipo <> 'devolucao' or new.origem_tipo <> 'pedido' or new.origem_id is null then return new; end if;
  select id into v_id from public.lancamentos where origem_tipo = 'pedido' and origem_id = new.origem_id and papel_origem = 'principal' and estornado_em is null;
  if v_id is null then return new; end if;
  select coalesce(sum(valor), 0) into v_realizado from public.lancamentos_realizacoes where lancamento_id = v_id;
  if v_realizado <= 0 then
    update public.lancamentos set cancelado_em = now(), cancelado_motivo = 'Pedido devolvido' where id = v_id and cancelado_em is null;
    return new;
  end if;
  select codigo into v_codigo from public.pedidos where id = new.origem_id;
  select id into v_categoria from public.categorias_financeiras where tipo = 'despesa' and nome = 'Reembolsos';
  insert into public.lancamentos (tipo, descricao, categoria_id, valor_previsto, competencia, data_prevista, origem_tipo, origem_id, papel_origem)
  values ('despesa', 'Reembolso do pedido ' || v_codigo, v_categoria, v_realizado, date_trunc('month', current_date)::date, current_date, 'reembolso_pedido', new.origem_id, 'principal')
  on conflict do nothing;
  update public.pedidos set status_pagamento = 'reembolsado' where id = new.origem_id;
  return new;
end $$;
create trigger mov_produto_reembolso after insert on public.movimentacoes_produto for each row execute function app.gancho_reembolso_pedido();

-- Compra confirmada vira pagável (categoria Insumos, embutida no custo). Manutenção com custo vira pagável.
create or replace function app.gancho_financeiro_compra() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_total numeric;
  v_categoria uuid;
  v_fornecedor text;
begin
  if new.status <> 'confirmada' or old.status = 'confirmada' then return new; end if;
  select coalesce(sum(custo_total), 0) into v_total from public.compras_itens where compra_id = new.id;
  if v_total <= 0 then return new; end if;
  select id into v_categoria from public.categorias_financeiras where tipo = 'despesa' and nome = 'Insumos';
  select nome into v_fornecedor from public.fornecedores where id = new.fornecedor_id;
  insert into public.lancamentos (tipo, descricao, categoria_id, valor_previsto, competencia, data_prevista, origem_tipo, origem_id, papel_origem)
  values ('despesa', 'Compra ' || coalesce(new.numero_documento, to_char(new.data, 'DD/MM/YYYY')) || coalesce(' (' || v_fornecedor || ')', ''), v_categoria, round(v_total, 2), date_trunc('month', new.data)::date, new.data, 'compra', new.id, 'principal')
  on conflict do nothing;
  return new;
end $$;
create trigger compras_financeiro after update of status on public.compras for each row execute function app.gancho_financeiro_compra();

create or replace function app.gancho_financeiro_manutencao() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_categoria uuid;
  v_impressora text;
begin
  if new.custo is null or new.custo <= 0 then return new; end if;
  select id into v_categoria from public.categorias_financeiras where tipo = 'despesa' and nome = 'Manutenção de impressora';
  select nome into v_impressora from public.impressoras where id = new.impressora_id;
  insert into public.lancamentos (tipo, descricao, categoria_id, valor_previsto, competencia, data_prevista, origem_tipo, origem_id, papel_origem)
  values ('despesa', 'Manutenção ' || coalesce(v_impressora, '') || ': ' || left(new.descricao, 120), v_categoria, new.custo, date_trunc('month', new.data)::date, new.data, 'manutencao', new.id, 'principal')
  on conflict do nothing;
  update public.manutencoes set lancamento_id = (select id from public.lancamentos where origem_tipo = 'manutencao' and origem_id = new.id) where id = new.id;
  return new;
end $$;
create trigger manutencoes_financeiro after insert on public.manutencoes for each row execute function app.gancho_financeiro_manutencao();

revoke execute on function public.realizar_lancamento(uuid, numeric, uuid, date, text, boolean, text), public.cancelar_lancamento(uuid, text), public.estornar_lancamento(uuid, text), public.garantir_recebivel(uuid) from public, anon;
grant execute on function public.realizar_lancamento(uuid, numeric, uuid, date, text, boolean, text), public.cancelar_lancamento(uuid, text), public.estornar_lancamento(uuid, text), public.garantir_recebivel(uuid) to authenticated, service_role;

-- Busca global ganha lançamento (só o dono enxerga, pela RLS).
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
  union all
  (select 'pedido'::text, pe.id::text, pe.codigo || coalesce(' · ' || pe.codigo_externo, ''), coalesce(cl.nome, st.nome), '/vendas/pedidos/' || pe.id,
          case when lower(pe.codigo) like '%' || q.t || '%' or lower(coalesce(pe.codigo_externo, '')) like '%' || q.t || '%' then 0.95 else similarity(app.normalizar(coalesce(cl.nome, '')), q.t) end::real
     from public.pedidos pe left join public.clientes cl on cl.id = pe.cliente_id join public.pedidos_status st on st.id = pe.status_id, q
    where (tipos is null or 'pedido' = any (tipos)) and char_length(q.t) >= 2
      and (lower(pe.codigo) like '%' || q.t || '%' or lower(coalesce(pe.codigo_externo, '')) like '%' || q.t || '%' or app.normalizar(coalesce(cl.nome, '')) % q.t)
    order by 6 desc limit limite)
  union all
  (select 'cliente'::text, cl.id::text, cl.nome, coalesce(cl.email, cl.telefone, ''), '/vendas/clientes?destaque=' || cl.id,
          greatest(similarity(app.normalizar(cl.nome), q.t), case when app.normalizar(cl.nome) like '%' || q.t || '%' then 0.9 else 0 end)::real
     from public.clientes cl, q
    where (tipos is null or 'cliente' = any (tipos)) and char_length(q.t) >= 2 and not cl.anonimizado
      and (app.normalizar(cl.nome) % q.t or app.normalizar(cl.nome) like '%' || q.t || '%') order by 6 desc limit limite)
  union all
  (select 'lancamento'::text, la.id::text, la.descricao, la.tipo || ' ' || to_char(la.data_prevista, 'DD/MM/YYYY'), '/financeiro/lancamentos?destaque=' || la.id,
          greatest(similarity(app.normalizar(la.descricao), q.t), case when app.normalizar(la.descricao) like '%' || q.t || '%' then 0.9 else 0 end)::real
     from public.lancamentos la, q
    where (tipos is null or 'lancamento' = any (tipos)) and char_length(q.t) >= 2
      and (app.normalizar(la.descricao) % q.t or app.normalizar(la.descricao) like '%' || q.t || '%') order by 6 desc limit limite)
) r
order by r.pontuacao desc, r.tipo, r.titulo;
$$;
