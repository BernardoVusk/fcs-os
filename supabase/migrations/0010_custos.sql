-- 0010: motor de custos. Parâmetros versionados, catálogo de componentes, impressoras (campos de custo)
-- e cálculos salvos como snapshot imutável. Nenhum valor padrão inventado: parâmetros nascem nulos.

create sequence app.parametros_custo_versao;

create table public.parametros_custo (
  id uuid primary key default gen_random_uuid(),
  versao integer not null unique default nextval('app.parametros_custo_versao'),
  vigente_desde date not null default current_date,
  -- tarifa_kwh, custo_hora_mao_obra, taxa_falha_padrao, desperdicio_padrao, custo_fixo_mensal, horas_produtivas_mes,
  -- volume_mensal_estimado, metodo_rateio_fixo (hora, peca, desligado), imposto_pct_estimado, metodo_margem_padrao
  -- (margem, markup), margem_alvo_padrao, markup_padrao. Campo ausente ou nulo = não configurado.
  dados jsonb not null default '{}'::jsonb,
  observacoes text,
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now()
);
create index parametros_custo_vigencia on public.parametros_custo (vigente_desde desc, versao desc);
create trigger parametros_custo_auditoria after insert or update or delete on public.parametros_custo for each row execute function app.auditar();

-- A versão vigente é a mais recente com vigência até hoje (empate: maior versão).
create view public.parametros_custo_vigentes with (security_invoker = true) as
select * from public.parametros_custo where vigente_desde <= current_date order by vigente_desde desc, versao desc limit 1;

create table public.componentes_custo (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[a-z_]{2,40}$'),
  nome text not null check (char_length(nome) between 1 and 80),
  grupo text not null check (grupo in ('material', 'maquina', 'energia', 'mao_obra', 'complementar', 'fixo', 'taxas')),
  metodo text not null check (metodo in ('por_grama', 'por_hora_maquina', 'por_hora_trabalho', 'fixo_por_peca', 'fixo_por_pedido', 'percentual_preco', 'rateio_mensal')),
  ativo boolean not null default true,
  /** Chave do componente no resultado do motor (null para os que não têm linha própria, como taxas). */
  chave_motor text,
  descricao text,
  parametros jsonb not null default '{}'::jsonb,
  ordem integer not null default 0,
  atualizado_em timestamptz not null default now()
);
create trigger componentes_custo_atualizado before update on public.componentes_custo for each row execute function app.carimbar_atualizacao();
create trigger componentes_custo_auditoria after insert or update or delete on public.componentes_custo for each row execute function app.auditar();

insert into public.componentes_custo (codigo, nome, grupo, metodo, chave_motor, descricao, ordem) values
  ('material', 'Material (filamento)', 'material', 'por_grama', 'material', 'Peso da peça com desperdício e fator de falha, ao custo de reposição do insumo.', 10),
  ('depreciacao', 'Depreciação da impressora', 'maquina', 'por_hora_maquina', 'depreciacao', '(aquisição - residual) / vida útil em horas, por hora de peça boa.', 20),
  ('manutencao', 'Manutenção', 'maquina', 'por_hora_maquina', 'manutencao', 'Manutenção anual / horas produtivas no ano.', 30),
  ('consumiveis', 'Consumíveis da impressora', 'maquina', 'por_hora_maquina', 'consumiveis', 'Bicos, mesa, correias: custo anual / horas produtivas.', 40),
  ('energia', 'Energia', 'energia', 'por_hora_maquina', 'energia', 'Potência média x tarifa do kWh, por hora de peça boa.', 50),
  ('preparo', 'Preparo (mão de obra)', 'mao_obra', 'por_hora_trabalho', 'preparo', 'Minutos por ciclo divididos pelas peças do ciclo, com fator de falha.', 60),
  ('acabamento', 'Acabamento (mão de obra)', 'mao_obra', 'por_hora_trabalho', 'acabamento', 'Minutos por peça boa. Não recebe fator de falha.', 70),
  ('embalagem', 'Embalagem (mão de obra)', 'mao_obra', 'por_hora_trabalho', 'embalagem', 'Minutos por peça boa. Não recebe fator de falha.', 80),
  ('complementares_peca', 'Complementares por peça', 'complementar', 'fixo_por_peca', 'complementares_peca', 'Ímã, parafuso, etiqueta da peça: quantidade x custo.', 90),
  ('complementares_pedido', 'Complementares por pedido', 'complementar', 'fixo_por_pedido', null, 'Caixa e embalagem de envio: entram nos fixos por unidade vendida (F), não no custo da peça.', 100),
  ('fixo_rateado', 'Custo fixo rateado', 'fixo', 'rateio_mensal', 'fixo_rateado', 'Custo fixo mensal por hora produtiva ou por peça, conforme o parâmetro. Só para precificar.', 110),
  ('taxas_canal', 'Taxas do canal', 'taxas', 'percentual_preco', null, 'Comissão, pagamento, imposto e ads sobre o preço, mais taxa fixa e frete subsidiado. Vêm do canal vigente.', 120);

create table public.impressoras (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(nome) between 1 and 80),
  fabricante text check (char_length(fabricante) <= 80),
  modelo text check (char_length(modelo) <= 80),
  custo_aquisicao numeric(14,2) check (custo_aquisicao >= 0),
  valor_residual numeric(14,2) not null default 0 check (valor_residual >= 0),
  data_aquisicao date,
  vida_util_horas integer check (vida_util_horas > 0),
  horas_uso numeric(14,2) not null default 0 check (horas_uso >= 0),
  potencia_media_w numeric(10,2) check (potencia_media_w >= 0),
  custo_manutencao_ano numeric(14,2) check (custo_manutencao_ano >= 0),
  custo_consumiveis_ano numeric(14,2) check (custo_consumiveis_ano >= 0),
  horas_produtivas_ano integer check (horas_produtivas_ano > 0),
  status text not null default 'ativa' check (status in ('ativa', 'manutencao', 'inativa')),
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index impressoras_busca on public.impressoras using gin (app.normalizar(nome) extensions.gin_trgm_ops);
create trigger impressoras_atualizado before update on public.impressoras for each row execute function app.carimbar_atualizacao();
create trigger impressoras_auditoria after insert or update or delete on public.impressoras for each row execute function app.auditar();

-- Snapshot imutável: entradas e resultado completos, mais a versão do motor. Produto e ordem chegam na Fase 5.
create table public.calculos_custo (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 120),
  produto_id uuid,
  variacao_id uuid,
  ordem_producao_id uuid,
  canal_id uuid references public.canais_venda (id),
  insumo_id uuid references public.insumos (id),
  impressora_id uuid references public.impressoras (id),
  parametros_versao integer references public.parametros_custo (versao),
  entradas jsonb not null,
  resultado jsonb not null,
  custo_variavel numeric(14,4) not null,
  custo_unitario_total numeric(14,4) not null,
  preco_sugerido numeric(14,2),
  metodo_margem text check (metodo_margem in ('margem', 'markup')),
  margem_alvo numeric(7,6) check (margem_alvo >= 0 and margem_alvo < 1),
  markup_alvo numeric(7,6) check (markup_alvo >= 0),
  versao_motor text not null,
  motivo text not null default 'manual' check (motivo in ('manual', 'recalculo', 'venda', 'ordem')),
  observacoes text,
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now()
);
create index calculos_custo_recentes on public.calculos_custo (criado_em desc);
create index calculos_custo_insumo on public.calculos_custo (insumo_id);
create index calculos_custo_produto on public.calculos_custo (produto_id);
create index calculos_custo_busca on public.calculos_custo using gin (app.normalizar(nome) extensions.gin_trgm_ops);

alter table public.parametros_custo enable row level security;
alter table public.componentes_custo enable row level security;
alter table public.impressoras enable row level security;
alter table public.calculos_custo enable row level security;

create policy parametros_ler on public.parametros_custo for select to authenticated using (app.usuario_ativo());
create policy parametros_inserir on public.parametros_custo for insert to authenticated with check (app.eh_dono());
create policy componentes_ler on public.componentes_custo for select to authenticated using (app.usuario_ativo());
create policy componentes_alterar on public.componentes_custo for update to authenticated using (app.eh_dono()) with check (app.eh_dono());
create policy impressoras_ler on public.impressoras for select to authenticated using (app.usuario_ativo());
create policy impressoras_escrever on public.impressoras for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy calculos_ler on public.calculos_custo for select to authenticated using (app.usuario_ativo());
create policy calculos_inserir on public.calculos_custo for insert to authenticated with check (app.pode_escrever());

-- Primeira versão de parâmetros, toda em branco: a calculadora mostra "Não configurado" até o dono preencher.
insert into public.parametros_custo (vigente_desde, dados, observacoes) values ('2026-01-01', '{}'::jsonb, 'Versão inicial sem valores. Preencha em Configurações > Parâmetros de custo.');

-- Busca global ganha impressora e cálculo salvo.
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
) r
order by r.pontuacao desc, r.tipo, r.titulo;
$$;
