-- Fase 8: planejamento de conteúdo e tarefas (spec 5.8).

-- Status por tipo de item: lista editável pelo dono, com um padrão por tipo e marca de fechado.
create table public.plan_fluxos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('tarefa', 'conteudo', 'projeto')),
  codigo text not null check (codigo ~ '^[a-z_]{2,30}$'),
  nome text not null check (char_length(nome) between 1 and 40),
  ordem integer not null default 0,
  cor text check (cor ~ '^#[0-9a-fA-F]{6}$'),
  fechado boolean not null default false,
  padrao boolean not null default false,
  unique (tipo, codigo)
);
create unique index plan_fluxos_padrao_unico on public.plan_fluxos (tipo) where padrao;
create trigger plan_fluxos_auditoria after insert or update or delete on public.plan_fluxos for each row execute function app.auditar();

insert into public.plan_fluxos (tipo, codigo, nome, ordem, fechado, padrao) values
  ('conteudo', 'ideia', 'Ideia', 10, false, true),
  ('conteudo', 'planejamento', 'Planejamento', 20, false, false),
  ('conteudo', 'roteiro', 'Roteiro', 30, false, false),
  ('conteudo', 'producao', 'Produção', 40, false, false),
  ('conteudo', 'revisao', 'Revisão', 50, false, false),
  ('conteudo', 'agendado', 'Agendado', 60, false, false),
  ('conteudo', 'publicado', 'Publicado', 70, true, false),
  ('conteudo', 'cancelado', 'Cancelado', 80, true, false),
  ('tarefa', 'a_fazer', 'A fazer', 10, false, true),
  ('tarefa', 'em_andamento', 'Em andamento', 20, false, false),
  ('tarefa', 'bloqueada', 'Bloqueada', 30, false, false),
  ('tarefa', 'concluida', 'Concluída', 40, true, false),
  ('tarefa', 'cancelada', 'Cancelada', 50, true, false),
  ('projeto', 'planejado', 'Planejado', 10, false, true),
  ('projeto', 'em_andamento', 'Em andamento', 20, false, false),
  ('projeto', 'pausado', 'Pausado', 30, false, false),
  ('projeto', 'concluido', 'Concluído', 40, true, false),
  ('projeto', 'cancelado', 'Cancelado', 50, true, false);

create table public.plan_campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 120),
  inicio date,
  fim date,
  objetivo text check (char_length(objetivo) <= 1000),
  status text not null default 'planejada' check (status in ('planejada', 'ativa', 'concluida', 'cancelada')),
  observacoes text check (char_length(observacoes) <= 2000),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (fim is null or inicio is null or fim >= inicio)
);
create trigger plan_campanhas_atualizado before update on public.plan_campanhas for each row execute function app.carimbar_atualizacao();
create trigger plan_campanhas_auditoria after insert or update or delete on public.plan_campanhas for each row execute function app.auditar();

-- Modelo reutilizável: campos padrão (título, prioridade, canal, formato, briefing, cta, tags) e checklist.
create table public.plan_modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 120),
  tipo text not null check (tipo in ('tarefa', 'conteudo', 'projeto')),
  campos_padrao jsonb not null default '{}'::jsonb check (jsonb_typeof(campos_padrao) = 'object'),
  checklist_padrao jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist_padrao) = 'array' and jsonb_array_length(checklist_padrao) <= 30),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger plan_modelos_atualizado before update on public.plan_modelos for each row execute function app.carimbar_atualizacao();
create trigger plan_modelos_auditoria after insert or update or delete on public.plan_modelos for each row execute function app.auditar();

-- Recorrência gera itens a partir de um modelo, até 60 dias à frente, um por (recorrência, prazo).
create table public.plan_recorrencias (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references public.plan_modelos (id) on delete cascade,
  frequencia text not null check (frequencia in ('semanal', 'mensal', 'anual')),
  dia integer check (dia between 0 and 31),
  inicio date not null,
  fim date,
  ativo boolean not null default true,
  observacoes text check (char_length(observacoes) <= 500),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger plan_recorrencias_atualizado before update on public.plan_recorrencias for each row execute function app.carimbar_atualizacao();
create trigger plan_recorrencias_auditoria after insert or update or delete on public.plan_recorrencias for each row execute function app.auditar();

create table public.plan_itens (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('tarefa', 'conteudo', 'projeto')),
  titulo text not null check (char_length(titulo) between 1 and 160),
  status text not null,
  prioridade text not null default 'media' check (prioridade in ('alta', 'media', 'baixa')),
  inicio date,
  prazo date,
  horario time,
  categoria_id uuid references public.categorias (id) on delete set null,
  tags text[] not null default '{}',
  responsavel text check (char_length(responsavel) <= 80),
  canal_publicacao text check (canal_publicacao in ('instagram', 'tiktok', 'shopee', 'mercado_livre', 'youtube', 'site', 'whatsapp', 'interno')),
  formato text check (formato in ('carrossel', 'reel', 'post', 'stories', 'video', 'foto_produto', 'descricao_anuncio', 'campanha_ads', 'outro')),
  legenda text check (char_length(legenda) <= 3000),
  briefing text check (char_length(briefing) <= 4000),
  cta text check (char_length(cta) <= 300),
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 20),
  referencias jsonb not null default '[]'::jsonb check (jsonb_typeof(referencias) = 'array' and jsonb_array_length(referencias) <= 20),
  observacoes text check (char_length(observacoes) <= 2000),
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 30),
  produto_id uuid references public.produtos (id) on delete set null,
  campanha_id uuid references public.plan_campanhas (id) on delete set null,
  pai_id uuid references public.plan_itens (id) on delete set null,
  modelo_id uuid references public.plan_modelos (id) on delete set null,
  recorrencia_id uuid references public.plan_recorrencias (id) on delete set null,
  concluido_em timestamptz,
  publicado_em timestamptz,
  metricas jsonb not null default '{}'::jsonb check (jsonb_typeof(metricas) = 'object'),
  origem text not null default 'manual' check (origem in ('manual', 'modelo', 'recorrencia', 'duplicado', 'mcp')),
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (pai_id is null or pai_id <> id),
  check (inicio is null or prazo is null or prazo >= inicio)
);
create index plan_itens_prazo on public.plan_itens (prazo);
create index plan_itens_inicio on public.plan_itens (inicio);
create index plan_itens_tipo_status on public.plan_itens (tipo, status);
create index plan_itens_campanha on public.plan_itens (campanha_id);
create index plan_itens_produto on public.plan_itens (produto_id);
create unique index plan_itens_recorrencia_prazo on public.plan_itens (recorrencia_id, prazo) where recorrencia_id is not null;
create index plan_itens_busca on public.plan_itens using gin (app.normalizar(titulo) extensions.gin_trgm_ops);
create trigger plan_itens_atualizado before update on public.plan_itens for each row execute function app.carimbar_atualizacao();

-- Status precisa existir no fluxo do tipo; entrar num status fechado carimba concluído (e publicado).
create or replace function app.validar_item_plano() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare
  f record;
begin
  if new.status is null or new.status = '' then
    select codigo into new.status from public.plan_fluxos where tipo = new.tipo and padrao limit 1;
  end if;
  select * into f from public.plan_fluxos where tipo = new.tipo and codigo = new.status;
  if not found then raise exception 'status_invalido'; end if;
  if f.fechado then
    if new.concluido_em is null then new.concluido_em := now(); end if;
    if f.codigo = 'publicado' and new.publicado_em is null then new.publicado_em := now(); end if;
  else
    new.concluido_em := null;
  end if;
  return new;
end $$;
create trigger plan_itens_validar before insert or update on public.plan_itens for each row execute function app.validar_item_plano();

create table public.plan_relacoes (
  id uuid primary key default gen_random_uuid(),
  de_id uuid not null references public.plan_itens (id) on delete cascade,
  para_id uuid not null references public.plan_itens (id) on delete cascade,
  tipo text not null default 'relacionada' check (tipo in ('bloqueia', 'relacionada')),
  criado_em timestamptz not null default now(),
  unique (de_id, para_id, tipo),
  check (de_id <> para_id)
);

create table public.plan_historico (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.plan_itens (id) on delete cascade,
  campo text not null,
  de text,
  para text,
  usuario_id uuid default app.usuario_da_requisicao(),
  em timestamptz not null default now()
);
create index plan_historico_item on public.plan_historico (item_id, em);

create or replace function app.historico_item_plano() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status is distinct from old.status then insert into public.plan_historico (item_id, campo, de, para) values (new.id, 'status', old.status, new.status); end if;
  if new.prazo is distinct from old.prazo then insert into public.plan_historico (item_id, campo, de, para) values (new.id, 'prazo', old.prazo::text, new.prazo::text); end if;
  if new.inicio is distinct from old.inicio then insert into public.plan_historico (item_id, campo, de, para) values (new.id, 'inicio', old.inicio::text, new.inicio::text); end if;
  if new.titulo is distinct from old.titulo then insert into public.plan_historico (item_id, campo, de, para) values (new.id, 'titulo', old.titulo, new.titulo); end if;
  if new.prioridade is distinct from old.prioridade then insert into public.plan_historico (item_id, campo, de, para) values (new.id, 'prioridade', old.prioridade, new.prioridade); end if;
  if new.campanha_id is distinct from old.campanha_id then insert into public.plan_historico (item_id, campo, de, para) values (new.id, 'campanha', old.campanha_id::text, new.campanha_id::text); end if;
  return new;
end $$;
create trigger plan_itens_historico after update on public.plan_itens for each row execute function app.historico_item_plano();

alter table public.plan_fluxos enable row level security;
alter table public.plan_campanhas enable row level security;
alter table public.plan_modelos enable row level security;
alter table public.plan_recorrencias enable row level security;
alter table public.plan_itens enable row level security;
alter table public.plan_relacoes enable row level security;
alter table public.plan_historico enable row level security;

create policy plan_fluxos_ler on public.plan_fluxos for select to authenticated using (app.usuario_ativo());
create policy plan_fluxos_escrever on public.plan_fluxos for all to authenticated using (app.eh_dono()) with check (app.eh_dono());
create policy plan_campanhas_ler on public.plan_campanhas for select to authenticated using (app.usuario_ativo());
create policy plan_campanhas_escrever on public.plan_campanhas for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy plan_modelos_ler on public.plan_modelos for select to authenticated using (app.usuario_ativo());
create policy plan_modelos_escrever on public.plan_modelos for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy plan_recorrencias_ler on public.plan_recorrencias for select to authenticated using (app.usuario_ativo());
create policy plan_recorrencias_escrever on public.plan_recorrencias for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy plan_itens_ler on public.plan_itens for select to authenticated using (app.usuario_ativo());
create policy plan_itens_inserir on public.plan_itens for insert to authenticated with check (app.pode_escrever());
create policy plan_itens_alterar on public.plan_itens for update to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy plan_itens_apagar on public.plan_itens for delete to authenticated using (app.eh_dono());
create policy plan_relacoes_ler on public.plan_relacoes for select to authenticated using (app.usuario_ativo());
create policy plan_relacoes_escrever on public.plan_relacoes for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy plan_historico_ler on public.plan_historico for select to authenticated using (app.usuario_ativo());

grant select, insert, update, delete on public.plan_fluxos, public.plan_campanhas, public.plan_modelos, public.plan_recorrencias, public.plan_itens, public.plan_relacoes to authenticated, service_role;
grant select, insert on public.plan_historico to authenticated, service_role;

-- Busca global ganha item do planejamento.
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
  union all
  (select 'tarefa'::text, pi.id::text, pi.titulo, pi.tipo || ' ' || pi.status || coalesce(' ' || to_char(pi.prazo, 'DD/MM/YYYY'), ''), '/planejamento/itens/' || pi.id,
          greatest(similarity(app.normalizar(pi.titulo), q.t), case when app.normalizar(pi.titulo) like '%' || q.t || '%' then 0.9 else 0 end)::real
     from public.plan_itens pi, q
    where (tipos is null or 'tarefa' = any (tipos)) and char_length(q.t) >= 2
      and (app.normalizar(pi.titulo) % q.t or app.normalizar(pi.titulo) like '%' || q.t || '%') order by 6 desc limit limite)
) r
order by r.pontuacao desc, r.tipo, r.titulo;
$$;
