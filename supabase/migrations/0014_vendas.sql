-- 0014: clientes, status de pedido configuráveis, pedidos com itens e eventos, importações idempotentes,
-- função atômica de mudança de status (congela custo, baixa peças prontas) e devolução.

alter table public.canais_venda add column mapeamento_pedidos jsonb not null default '{}'::jsonb;

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 160),
  email text check (char_length(email) <= 160),
  telefone text check (char_length(telefone) <= 40),
  documento text check (char_length(documento) <= 20),
  endereco jsonb not null default '{}'::jsonb,
  canal_origem_id uuid references public.canais_venda (id),
  observacoes text,
  anonimizado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index clientes_busca on public.clientes using gin (app.normalizar(nome) extensions.gin_trgm_ops);
create trigger clientes_atualizado before update on public.clientes for each row execute function app.carimbar_atualizacao();
create trigger clientes_auditoria after insert or update or delete on public.clientes for each row execute function app.auditar();

create table public.pedidos_status (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[a-z_]{2,40}$'),
  nome text not null check (char_length(nome) between 1 and 60),
  ordem integer not null,
  cor text check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  fechado boolean not null default false,
  gera_recebivel boolean not null default false,
  baixa_estoque boolean not null default false,
  padrao boolean not null default false,
  ativo boolean not null default true
);
create unique index pedidos_status_recebivel_unico on public.pedidos_status (gera_recebivel) where gera_recebivel;
create unique index pedidos_status_baixa_unico on public.pedidos_status (baixa_estoque) where baixa_estoque;
create unique index pedidos_status_padrao_unico on public.pedidos_status (padrao) where padrao;
create trigger pedidos_status_auditoria after insert or update or delete on public.pedidos_status for each row execute function app.auditar();

insert into public.pedidos_status (codigo, nome, ordem, fechado, gera_recebivel, baixa_estoque, padrao) values
  ('recebido', 'Recebido', 10, false, false, false, true),
  ('aguardando_pagamento', 'Aguardando pagamento', 20, false, false, false, false),
  ('pagamento_aprovado', 'Pagamento aprovado', 30, false, true, false, false),
  ('aguardando_producao', 'Aguardando produção', 40, false, false, false, false),
  ('em_producao', 'Em produção', 50, false, false, false, false),
  ('em_acabamento', 'Em acabamento', 60, false, false, false, false),
  ('em_embalagem', 'Em embalagem', 70, false, false, false, false),
  ('pronto_para_envio', 'Pronto para envio', 80, false, false, false, false),
  ('enviado', 'Enviado', 90, false, false, true, false),
  ('concluido', 'Concluído', 100, true, false, false, false),
  ('cancelado', 'Cancelado', 110, true, false, false, false),
  ('devolvido', 'Devolvido', 120, true, false, false, false);

create sequence app.pedidos_seq;
grant usage, select on sequence app.pedidos_seq to authenticated, service_role;

create table public.importacoes (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid references public.canais_venda (id),
  tipo text not null default 'pedidos' check (tipo in ('pedidos', 'catalogo', 'repasses')),
  nome_arquivo text not null,
  hash_sha256 text not null unique check (hash_sha256 ~ '^[0-9a-f]{64}$'),
  total_linhas integer not null default 0,
  criadas integer not null default 0,
  atualizadas integer not null default 0,
  ignoradas integer not null default 0,
  erros jsonb not null default '[]'::jsonb,
  usuario_id uuid default app.usuario_da_requisicao(),
  em timestamptz not null default now()
);

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default 'PED-' || lpad(nextval('app.pedidos_seq')::text, 5, '0'),
  canal_id uuid not null references public.canais_venda (id),
  codigo_externo text check (char_length(codigo_externo) between 1 and 80),
  cliente_id uuid references public.clientes (id),
  status_id uuid not null references public.pedidos_status (id),
  data_pedido date not null default current_date,
  data_pagamento date,
  data_envio date,
  data_conclusao date,
  descontos_vendedor numeric(14,2) not null default 0 check (descontos_vendedor >= 0),
  frete_cobrado numeric(14,2) not null default 0 check (frete_cobrado >= 0),
  frete_pago numeric(14,2) not null default 0 check (frete_pago >= 0),
  comissao_pct numeric(7,6),
  taxa_pagamento_pct numeric(7,6),
  taxa_fixa_item numeric(14,2),
  taxas_canal_informadas numeric(14,2),
  taxas_pagamento_informadas numeric(14,2),
  total_bruto_informado numeric(14,2),
  status_pagamento text not null default 'pendente' check (status_pagamento in ('pendente', 'pago', 'reembolsado')),
  status_canal text,
  origem text not null default 'manual' check (origem in ('manual', 'importacao')),
  importacao_id uuid references public.importacoes (id),
  resumo jsonb,
  observacoes text,
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (canal_id, codigo_externo)
);
create index pedidos_por_status on public.pedidos (status_id, data_pedido desc);
create index pedidos_data on public.pedidos (data_pedido desc);
create index pedidos_pagamento on public.pedidos (data_pagamento);
create index pedidos_cliente on public.pedidos (cliente_id);
create trigger pedidos_atualizado before update on public.pedidos for each row execute function app.carimbar_atualizacao();
create trigger pedidos_auditoria after insert or update or delete on public.pedidos for each row execute function app.auditar();

create table public.pedidos_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  ordem integer not null default 0,
  produto_id uuid references public.produtos (id),
  variacao_id uuid references public.produtos_variacoes (id),
  codigo_anuncio text,
  titulo text,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(14,2) not null check (preco_unitario >= 0),
  desconto numeric(14,2) not null default 0 check (desconto >= 0),
  custo_unitario_estimado numeric(14,4),
  calculo_custo_id uuid references public.calculos_custo (id),
  custo_unitario_realizado numeric(14,6),
  criado_em timestamptz not null default now()
);
create index pedidos_itens_pedido on public.pedidos_itens (pedido_id, ordem);
create index pedidos_itens_produto on public.pedidos_itens (produto_id);

create table public.pedidos_eventos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  de_status_id uuid references public.pedidos_status (id),
  para_status_id uuid not null references public.pedidos_status (id),
  origem text not null default 'manual' check (origem in ('manual', 'importacao', 'sistema')),
  nota text,
  usuario_id uuid default app.usuario_da_requisicao(),
  em timestamptz not null default now()
);
create index pedidos_eventos_pedido on public.pedidos_eventos (pedido_id, em);

alter table public.ordens_producao add constraint ordens_pedido_item_fk foreign key (pedido_item_id) references public.pedidos_itens (id) on delete set null;

alter table public.clientes enable row level security;
alter table public.pedidos_status enable row level security;
alter table public.importacoes enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedidos_itens enable row level security;
alter table public.pedidos_eventos enable row level security;
create policy clientes_ler on public.clientes for select to authenticated using (app.usuario_ativo());
create policy clientes_escrever on public.clientes for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy status_ler on public.pedidos_status for select to authenticated using (app.usuario_ativo());
create policy status_escrever on public.pedidos_status for all to authenticated using (app.eh_dono()) with check (app.eh_dono());
create policy importacoes_ler on public.importacoes for select to authenticated using (app.usuario_ativo());
create policy importacoes_inserir on public.importacoes for insert to authenticated with check (app.pode_escrever());
create policy pedidos_ler on public.pedidos for select to authenticated using (app.usuario_ativo());
create policy pedidos_escrever on public.pedidos for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy itens_ler on public.pedidos_itens for select to authenticated using (app.usuario_ativo());
create policy itens_escrever on public.pedidos_itens for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy eventos_ler on public.pedidos_eventos for select to authenticated using (app.usuario_ativo());
create policy eventos_inserir on public.pedidos_eventos for insert to authenticated with check (app.pode_escrever());

-- Muda o status gravando o evento. Ao entrar no status que gera recebível: marca pago e congela o custo estimado dos
-- itens. Ao entrar no status de expedição: baixa as peças prontas ao custo médio e grava o custo realizado por item.
create or replace function public.mudar_status_pedido(p_pedido uuid, p_status_codigo text, p_nota text default null, p_origem text default 'manual') returns jsonb
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  p record;
  de record;
  para record;
  it record;
  v_custo numeric;
  v_saldo integer;
  v_baixados integer := 0;
begin
  select * into p from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'pedido_nao_encontrado'; end if;
  select * into de from public.pedidos_status where id = p.status_id;
  select * into para from public.pedidos_status where codigo = p_status_codigo and ativo;
  if not found then raise exception 'status_invalido'; end if;
  if para.id = p.status_id then return jsonb_build_object('status', para.codigo, 'baixados', 0, 'mudou', false); end if;
  if p_origem = 'importacao' and para.ordem <= de.ordem then return jsonb_build_object('status', de.codigo, 'baixados', 0, 'mudou', false); end if;
  if para.codigo = 'cancelado' and p.data_envio is not null then raise exception 'pedido_ja_enviado'; end if;

  if para.gera_recebivel and p.data_pagamento is null then
    update public.pedidos set data_pagamento = current_date, status_pagamento = 'pago' where id = p_pedido;
    -- Congela o custo estimado: custo variável atual da variação ou do produto, com o cálculo que o gerou.
    update public.pedidos_itens i
       set custo_unitario_estimado = coalesce(i.custo_unitario_estimado, v.custo_variavel_atual, pr.custo_variavel_atual),
           calculo_custo_id = coalesce(i.calculo_custo_id, v.calculo_atual_id, pr.calculo_atual_id)
      from public.produtos pr left join public.produtos_variacoes v on false
     where i.pedido_id = p_pedido and i.produto_id = pr.id and i.variacao_id is null;
    update public.pedidos_itens i
       set custo_unitario_estimado = coalesce(i.custo_unitario_estimado, v.custo_variavel_atual, pr.custo_variavel_atual),
           calculo_custo_id = coalesce(i.calculo_custo_id, v.calculo_atual_id, pr.calculo_atual_id)
      from public.produtos_variacoes v join public.produtos pr on pr.id = v.produto_id
     where i.pedido_id = p_pedido and i.variacao_id = v.id;
  end if;

  if para.baixa_estoque and p.data_envio is null then
    for it in select * from public.pedidos_itens where pedido_id = p_pedido and produto_id is not null loop
      select coalesce(sum(quantidade), 0), case when coalesce(sum(quantidade), 0) > 0 then sum(valor) / sum(quantidade) else null end
        into v_saldo, v_custo
        from public.movimentacoes_produto
       where produto_id = it.produto_id and coalesce(variacao_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(it.variacao_id, '00000000-0000-0000-0000-000000000000'::uuid);
      if v_saldo < it.quantidade then
        raise exception 'sem_pecas_prontas' using detail = (select nome from public.produtos where id = it.produto_id);
      end if;
      insert into public.movimentacoes_produto (produto_id, variacao_id, tipo, quantidade, valor, custo_unitario_momento, motivo, origem_tipo, origem_id)
      values (it.produto_id, it.variacao_id, 'venda', -it.quantidade, -round(v_custo * it.quantidade, 4), round(v_custo, 6), 'Pedido ' || p.codigo, 'pedido', p_pedido);
      update public.pedidos_itens set custo_unitario_realizado = round(v_custo, 6) where id = it.id;
      v_baixados := v_baixados + it.quantidade;
    end loop;
    update public.pedidos set data_envio = current_date where id = p_pedido;
  end if;

  if para.codigo = 'concluido' then update public.pedidos set data_conclusao = current_date where id = p_pedido; end if;
  insert into public.pedidos_eventos (pedido_id, de_status_id, para_status_id, origem, nota) values (p_pedido, p.status_id, para.id, p_origem, p_nota);
  update public.pedidos set status_id = para.id, status_canal = coalesce(status_canal, status_canal) where id = p_pedido;
  return jsonb_build_object('status', para.codigo, 'baixados', v_baixados, 'mudou', true);
end $$;

-- Devolução depois do envio: peças voltam ao estoque pelo custo que saíram; status vira devolvido.
create or replace function public.devolver_pedido(p_pedido uuid, p_nota text default null) returns jsonb
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  p record;
  it record;
  v_itens integer := 0;
begin
  select * into p from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'pedido_nao_encontrado'; end if;
  if p.data_envio is null then raise exception 'pedido_nao_enviado'; end if;
  if exists (select 1 from public.movimentacoes_produto where origem_tipo = 'pedido' and origem_id = p_pedido and tipo = 'devolucao') then raise exception 'pedido_ja_devolvido'; end if;
  for it in select * from public.pedidos_itens where pedido_id = p_pedido and produto_id is not null and custo_unitario_realizado is not null loop
    insert into public.movimentacoes_produto (produto_id, variacao_id, tipo, quantidade, valor, custo_unitario_momento, motivo, origem_tipo, origem_id)
    values (it.produto_id, it.variacao_id, 'devolucao', it.quantidade, round(it.custo_unitario_realizado * it.quantidade, 4), it.custo_unitario_realizado, 'Devolução do pedido ' || p.codigo, 'pedido', p_pedido);
    v_itens := v_itens + it.quantidade;
  end loop;
  perform public.mudar_status_pedido(p_pedido, 'devolvido', coalesce(p_nota, 'Devolução'), 'sistema');
  return jsonb_build_object('devolvidos', v_itens);
end $$;

create or replace function public.anonimizar_cliente(p_cliente uuid) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  update public.clientes set nome = 'Cliente removido', email = null, telefone = null, documento = null, endereco = '{}'::jsonb, observacoes = null, anonimizado = true where id = p_cliente;
  if not found then raise exception 'cliente_nao_encontrado'; end if;
end $$;

revoke execute on function public.mudar_status_pedido(uuid, text, text, text), public.devolver_pedido(uuid, text), public.anonimizar_cliente(uuid) from public, anon;
grant execute on function public.mudar_status_pedido(uuid, text, text, text), public.devolver_pedido(uuid, text), public.anonimizar_cliente(uuid) to authenticated, service_role;

-- Busca global ganha pedido (código, código externo, cliente) e cliente.
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
) r
order by r.pontuacao desc, r.tipo, r.titulo;
$$;
