-- 0024: Grupos de Ofertas, WhatsApp. Números (cadastro do dono com aceite de risco), estado e
-- trava por número (worker), sessão cifrada, QR e código de pareamento, comandos ERP -> worker,
-- eventos de conexão, medições de membros, entradas e saídas sem telefone de participante e
-- lacunas de coleta. O ERP nunca fala com o WhatsApp: só escreve comandos e lê estado.

create table public.ofe_numeros (
  id uuid primary key default gen_random_uuid(),
  rotulo text not null check (char_length(rotulo) between 1 and 60),
  -- 55 + DDD + número, só para o código de pareamento. É o número da própria empresa.
  telefone text check (telefone ~ '^55\d{10,11}$'),
  aceite_risco_em timestamptz,
  aceite_risco_por uuid references public.usuarios_app (id),
  aceite_risco_versao text check (char_length(aceite_risco_versao) <= 20),
  limite_por_hora integer not null default 20 check (limite_por_hora between 1 and 200),
  limite_por_dia integer not null default 120 check (limite_por_dia between 1 and 2000),
  intervalo_min_segundos integer not null default 90 check (intervalo_min_segundos between 20 and 3600),
  janela_inicio time not null default '08:00',
  janela_fim time not null default '22:00',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (janela_fim > janela_inicio)
);
create trigger ofe_numeros_atualizado before update on public.ofe_numeros
  for each row execute function app.carimbar_atualizacao();
create trigger ofe_numeros_auditoria after insert or update or delete on public.ofe_numeros
  for each row execute function app.auditar();
alter table public.ofe_numeros enable row level security;
create policy ofe_numeros_ler on public.ofe_numeros for select to authenticated using (app.usuario_ativo());
create policy ofe_numeros_dono on public.ofe_numeros for all to authenticated
  using (app.eh_dono()) with check (app.eh_dono());

-- Estado vivo do número (worker escreve, tela lê). Fora da auditoria: muda a cada minuto.
create table public.ofe_numeros_estado (
  numero_id uuid primary key references public.ofe_numeros (id) on delete cascade,
  status text not null default 'desconectado' check (status in (
    'desconectado', 'aguardando_qr', 'conectando', 'conectado', 'erro', 'removido')),
  jid_proprio text check (char_length(jid_proprio) <= 80),
  nome_exibido text check (char_length(nome_exibido) <= 120),
  worker_id text check (char_length(worker_id) <= 80),
  trava_ate timestamptz,
  ultima_atividade_em timestamptz,
  ultima_sincronizacao_em timestamptz,
  ultimo_erro text check (char_length(ultimo_erro) <= 300),
  atualizado_em timestamptz not null default now()
);
alter table public.ofe_numeros_estado enable row level security;
create policy ofe_numeros_estado_ler on public.ofe_numeros_estado for select to authenticated using (app.usuario_ativo());

-- Sessão do WhatsApp (credenciais e chaves do protocolo), cifrada pelo worker. Ninguém lê pela sessão.
create table public.ofe_sessoes (
  numero_id uuid not null references public.ofe_numeros (id) on delete cascade,
  chave text not null check (char_length(chave) between 1 and 300),
  valor text not null check (char_length(valor) <= 400000 and valor like 'v1.%'),
  atualizado_em timestamptz not null default now(),
  primary key (numero_id, chave)
);
alter table public.ofe_sessoes enable row level security;
revoke all on public.ofe_sessoes from anon, authenticated;

-- QR Code ou código de pareamento em curso. Só o dono vê; apagado ao conectar ou vencer.
create table public.ofe_qr (
  numero_id uuid primary key references public.ofe_numeros (id) on delete cascade,
  tipo text not null check (tipo in ('qr', 'pareamento')),
  conteudo text not null check (char_length(conteudo) <= 20000),
  expira_em timestamptz not null,
  criado_em timestamptz not null default now()
);
alter table public.ofe_qr enable row level security;
create policy ofe_qr_dono on public.ofe_qr for select to authenticated using (app.eh_dono());

create table public.ofe_comandos (
  id uuid primary key default gen_random_uuid(),
  numero_id uuid not null references public.ofe_numeros (id) on delete cascade,
  tipo text not null check (tipo in ('conectar', 'parear', 'desconectar', 'remover', 'sincronizar_grupos', 'enviar_teste')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pendente' check (status in ('pendente', 'processando', 'concluido', 'falhou')),
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now(),
  processado_em timestamptz,
  resultado text check (char_length(resultado) <= 500)
);
create index ofe_comandos_fila on public.ofe_comandos (status, criado_em);
alter table public.ofe_comandos enable row level security;
create policy ofe_comandos_ler on public.ofe_comandos for select to authenticated using (app.pode_escrever());

create table public.ofe_numeros_eventos (
  id bigint generated always as identity primary key,
  numero_id uuid not null references public.ofe_numeros (id) on delete cascade,
  tipo text not null check (tipo in (
    'conectado', 'desconectado', 'reconectando', 'qr_gerado', 'pareamento_gerado', 'sessao_encerrada', 'erro', 'removido', 'comando')),
  detalhe text check (char_length(detalhe) <= 300),
  ocorrido_em timestamptz not null default now()
);
create index ofe_numeros_eventos_numero on public.ofe_numeros_eventos (numero_id, ocorrido_em desc);
alter table public.ofe_numeros_eventos enable row level security;
create policy ofe_numeros_eventos_ler on public.ofe_numeros_eventos for select to authenticated using (app.usuario_ativo());

create table public.ofe_worker_estado (
  worker_id text primary key check (char_length(worker_id) <= 80),
  versao text check (char_length(versao) <= 40),
  iniciado_em timestamptz not null default now(),
  ultimo_batimento_em timestamptz not null default now()
);
alter table public.ofe_worker_estado enable row level security;
create policy ofe_worker_estado_ler on public.ofe_worker_estado for select to authenticated using (app.usuario_ativo());

-- Grupos: número que coleta os eventos (só ele conta, para não contar duas vezes) e início da coleta.
alter table public.ofe_grupos
  add column numero_coletor_id uuid references public.ofe_numeros (id) on delete set null,
  add column coleta_iniciada_em timestamptz,
  add column so_admins boolean;

create table public.ofe_grupos_numeros (
  grupo_id uuid not null references public.ofe_grupos (id) on delete cascade,
  numero_id uuid not null references public.ofe_numeros (id) on delete cascade,
  admin boolean not null default false,
  visto_em timestamptz not null default now(),
  primary key (grupo_id, numero_id)
);
alter table public.ofe_grupos_numeros enable row level security;
create policy ofe_grupos_numeros_ler on public.ofe_grupos_numeros for select to authenticated using (app.usuario_ativo());

create table public.ofe_grupos_medicoes (
  id bigint generated always as identity primary key,
  grupo_id uuid not null references public.ofe_grupos (id) on delete cascade,
  medido_em timestamptz not null default now(),
  membros integer not null check (membros >= 0),
  origem text not null check (origem in ('sincronizacao', 'evento'))
);
create index ofe_grupos_medicoes_grupo on public.ofe_grupos_medicoes (grupo_id, medido_em desc);
alter table public.ofe_grupos_medicoes enable row level security;
create policy ofe_grupos_medicoes_ler on public.ofe_grupos_medicoes for select to authenticated using (app.usuario_ativo());

-- Só contagem: nenhum telefone ou identificador de participante é guardado (LGPD, minimização).
create table public.ofe_grupos_eventos (
  id bigint generated always as identity primary key,
  grupo_id uuid not null references public.ofe_grupos (id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade integer not null check (quantidade > 0),
  ocorrido_em timestamptz not null default now()
);
create index ofe_grupos_eventos_grupo on public.ofe_grupos_eventos (grupo_id, ocorrido_em);
alter table public.ofe_grupos_eventos enable row level security;
create policy ofe_grupos_eventos_ler on public.ofe_grupos_eventos for select to authenticated using (app.usuario_ativo());

-- Períodos sem coleta (número fora do ar ou worker parado): métricas que cruzam viram "parciais".
create table public.ofe_coleta_lacunas (
  id bigint generated always as identity primary key,
  numero_id uuid not null references public.ofe_numeros (id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz,
  motivo text check (char_length(motivo) <= 120),
  check (fim is null or fim >= inicio)
);
create unique index ofe_coleta_lacuna_aberta on public.ofe_coleta_lacunas (numero_id) where fim is null;
create index ofe_coleta_lacunas_numero on public.ofe_coleta_lacunas (numero_id, inicio);
alter table public.ofe_coleta_lacunas enable row level security;
create policy ofe_coleta_lacunas_ler on public.ofe_coleta_lacunas for select to authenticated using (app.usuario_ativo());

alter table public.ofe_publicacoes add column numero_id uuid references public.ofe_numeros (id);
alter table public.ofe_envios add column numero_id uuid references public.ofe_numeros (id);
create index ofe_envios_numero on public.ofe_envios (numero_id, status, enviado_em desc);

-- Membros atuais por grupo (última medição) e quem coleta.
create view public.ofe_grupos_resumo with (security_invoker = true) as
select g.*, m.membros as membros_atual, m.medido_em as membros_medido_em
  from public.ofe_grupos g
  left join lateral (
    select membros, medido_em from public.ofe_grupos_medicoes x
     where x.grupo_id = g.id order by medido_em desc limit 1
  ) m on true;

-- ERP -> worker. Conectar, parear, desconectar e remover são do dono e exigem aceite de risco;
-- sincronizar e teste, de quem escreve. Um comando pendente por tipo e número (clique duplo).
create or replace function public.ofe_enviar_comando(p_numero uuid, p_tipo text, p_payload jsonb default '{}'::jsonb)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
  n record;
begin
  if p_tipo in ('conectar', 'parear', 'desconectar', 'remover') then
    if not app.eh_dono() then raise exception 'sem_permissao'; end if;
  elsif p_tipo in ('sincronizar_grupos', 'enviar_teste') then
    if not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  else
    raise exception 'tipo_invalido';
  end if;
  select * into n from public.ofe_numeros where id = p_numero and ativo;
  if not found then raise exception 'nao_encontrado'; end if;
  if p_tipo in ('conectar', 'parear') and n.aceite_risco_em is null then raise exception 'aceite_obrigatorio'; end if;
  if p_tipo = 'parear' and n.telefone is null then raise exception 'telefone_obrigatorio'; end if;
  if p_tipo = 'enviar_teste' then
    if not exists (select 1 from public.ofe_grupos g where g.id = (p_payload->>'grupo_id')::uuid and g.funcao = 'teste' and g.jid is not null) then
      raise exception 'grupo_teste_obrigatorio';
    end if;
  end if;
  select id into v_id from public.ofe_comandos
   where numero_id = p_numero and tipo = p_tipo and status in ('pendente', 'processando') limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.ofe_comandos (numero_id, tipo, payload) values (p_numero, p_tipo, coalesce(p_payload, '{}'::jsonb))
  returning id into v_id;
  if p_tipo = 'remover' then
    update public.ofe_numeros set ativo = false where id = p_numero;
  end if;
  return v_id;
end $$;
revoke execute on function public.ofe_enviar_comando(uuid, text, jsonb) from public, anon;
grant execute on function public.ofe_enviar_comando(uuid, text, jsonb) to authenticated;

-- Junta um grupo cadastrado à mão com o mesmo grupo sincronizado pelo número (fica um só).
create or replace function public.ofe_vincular_grupo(p_manual uuid, p_sincronizado uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  s record;
begin
  if not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  select * into s from public.ofe_grupos where id = p_sincronizado and cadastro = 'sincronizado';
  if not found then raise exception 'nao_encontrado'; end if;
  if not exists (select 1 from public.ofe_grupos where id = p_manual and cadastro = 'manual') then raise exception 'nao_encontrado'; end if;
  if exists (select 1 from public.ofe_envios where grupo_id = p_sincronizado) then raise exception 'grupo_com_historico'; end if;
  update public.ofe_grupos_medicoes set grupo_id = p_manual where grupo_id = p_sincronizado;
  update public.ofe_grupos_eventos set grupo_id = p_manual where grupo_id = p_sincronizado;
  insert into public.ofe_grupos_numeros (grupo_id, numero_id, admin, visto_em)
  select p_manual, numero_id, admin, visto_em from public.ofe_grupos_numeros where grupo_id = p_sincronizado
  on conflict (grupo_id, numero_id) do nothing;
  delete from public.ofe_grupos where id = p_sincronizado;
  update public.ofe_grupos
     set jid = s.jid, cadastro = 'sincronizado', numero_coletor_id = s.numero_coletor_id,
         coleta_iniciada_em = s.coleta_iniciada_em, so_admins = s.so_admins
   where id = p_manual;
end $$;
revoke execute on function public.ofe_vincular_grupo(uuid, uuid) from public, anon;
grant execute on function public.ofe_vincular_grupo(uuid, uuid) to authenticated;

-- Funções do worker (papel ofe_worker). security invoker: o papel só tem grant nas tabelas ofe_*.
create or replace function public.ofe_w_batimento(p_worker text, p_versao text) returns void
language sql security invoker set search_path = public, pg_temp as $$
  insert into public.ofe_worker_estado (worker_id, versao, iniciado_em, ultimo_batimento_em)
  values (p_worker, p_versao, now(), now())
  on conflict (worker_id) do update set versao = excluded.versao, ultimo_batimento_em = now();
$$;

-- Trava do número: só um worker abre a sessão (duas sessões iguais derrubam uma à outra).
create or replace function public.ofe_w_assumir_numero(p_numero uuid, p_worker text, p_segundos integer default 90)
returns boolean
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  insert into public.ofe_numeros_estado (numero_id) values (p_numero) on conflict (numero_id) do nothing;
  update public.ofe_numeros_estado
     set worker_id = p_worker, trava_ate = now() + make_interval(secs => p_segundos), atualizado_em = now()
   where numero_id = p_numero and (worker_id is null or worker_id = p_worker or trava_ate is null or trava_ate < now());
  return found;
end $$;

create or replace function public.ofe_w_liberar_numero(p_numero uuid, p_worker text) returns void
language sql security invoker set search_path = public, pg_temp as $$
  update public.ofe_numeros_estado set worker_id = null, trava_ate = null, atualizado_em = now()
   where numero_id = p_numero and worker_id = p_worker;
$$;

create or replace function public.ofe_w_proximo_comando(p_worker text) returns setof public.ofe_comandos
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  select c.id into v_id
    from public.ofe_comandos c
    left join public.ofe_numeros_estado e on e.numero_id = c.numero_id
   where c.status = 'pendente'
     and (e.worker_id is null or e.worker_id = p_worker or e.trava_ate < now())
   order by c.criado_em
   for update of c skip locked
   limit 1;
  if v_id is null then return; end if;
  return query update public.ofe_comandos set status = 'processando' where id = v_id returning *;
end $$;

create or replace function public.ofe_w_concluir_comando(p_id uuid, p_ok boolean, p_resultado text default null) returns void
language sql security invoker set search_path = public, pg_temp as $$
  update public.ofe_comandos
     set status = case when p_ok then 'concluido' else 'falhou' end, processado_em = now(), resultado = left(p_resultado, 500)
   where id = p_id and status = 'processando';
$$;

-- Estado da conexão. Mudança de status gera evento; desconexão abre lacuna de coleta e conexão fecha.
create or replace function public.ofe_w_estado(
  p_numero uuid, p_status text, p_jid text default null, p_nome text default null, p_erro text default null, p_detalhe text default null
) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_antes text;
begin
  select status into v_antes from public.ofe_numeros_estado where numero_id = p_numero;
  insert into public.ofe_numeros_estado (numero_id, status) values (p_numero, p_status) on conflict (numero_id) do nothing;
  update public.ofe_numeros_estado
     set status = p_status,
         jid_proprio = coalesce(p_jid, jid_proprio),
         nome_exibido = coalesce(p_nome, nome_exibido),
         ultimo_erro = case when p_status in ('erro', 'desconectado') then left(coalesce(p_erro, ultimo_erro), 300) when p_status = 'conectado' then null else ultimo_erro end,
         ultima_atividade_em = now(),
         atualizado_em = now()
   where numero_id = p_numero;
  if v_antes is distinct from p_status and p_status in ('conectado', 'desconectado', 'erro', 'removido') then
    insert into public.ofe_numeros_eventos (numero_id, tipo, detalhe)
    values (p_numero, case p_status when 'erro' then 'erro' else p_status end, left(coalesce(p_detalhe, p_erro), 300));
  end if;
  if p_status = 'conectado' then
    update public.ofe_coleta_lacunas set fim = now() where numero_id = p_numero and fim is null;
    delete from public.ofe_qr where numero_id = p_numero;
  elsif p_status in ('desconectado', 'erro', 'removido') and v_antes = 'conectado' then
    insert into public.ofe_coleta_lacunas (numero_id, inicio, motivo) values (p_numero, now(), left(coalesce(p_erro, p_status), 120))
    on conflict do nothing;
  end if;
end $$;

-- Worker voltou depois de parado: abre lacuna desde a última atividade do número, se estava conectado.
create or replace function public.ofe_w_lacuna_desde(p_numero uuid, p_inicio timestamptz, p_motivo text) returns void
language sql security invoker set search_path = public, pg_temp as $$
  insert into public.ofe_coleta_lacunas (numero_id, inicio, motivo)
  select p_numero, least(p_inicio, now()), left(p_motivo, 120)
   where not exists (select 1 from public.ofe_coleta_lacunas where numero_id = p_numero and fim is null);
$$;

create or replace function public.ofe_w_evento_numero(p_numero uuid, p_tipo text, p_detalhe text default null) returns void
language sql security invoker set search_path = public, pg_temp as $$
  insert into public.ofe_numeros_eventos (numero_id, tipo, detalhe) values (p_numero, p_tipo, left(p_detalhe, 300));
$$;

create or replace function public.ofe_w_qr(p_numero uuid, p_tipo text, p_conteudo text, p_segundos integer default 60) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if p_conteudo is null then
    delete from public.ofe_qr where numero_id = p_numero;
    return;
  end if;
  insert into public.ofe_qr (numero_id, tipo, conteudo, expira_em)
  values (p_numero, p_tipo, p_conteudo, now() + make_interval(secs => p_segundos))
  on conflict (numero_id) do update set tipo = excluded.tipo, conteudo = excluded.conteudo, expira_em = excluded.expira_em, criado_em = now();
  update public.ofe_numeros_estado set status = 'aguardando_qr', atualizado_em = now() where numero_id = p_numero;
end $$;

-- Sincronização dos grupos do número: cria grupos novos sem função (o usuário decide), atualiza
-- nome, registra participação e mede membros (uma medição a cada 6 horas ou quando muda).
create or replace function public.ofe_w_sincronizar_grupos(p_numero uuid, p_grupos jsonb) returns integer
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  g jsonb;
  v_id uuid;
  v_membros integer;
  v_ultima record;
  n integer := 0;
begin
  for g in select * from jsonb_array_elements(coalesce(p_grupos, '[]'::jsonb)) loop
    if coalesce(g->>'jid', '') !~ '^[0-9-]+@g\.us$' then continue; end if;
    select id into v_id from public.ofe_grupos where jid = g->>'jid';
    if v_id is null then
      insert into public.ofe_grupos (nome, funcao, cadastro, jid, numero_coletor_id, coleta_iniciada_em, so_admins)
      values (left(coalesce(nullif(g->>'nome', ''), 'Grupo sem nome'), 120), 'nenhuma', 'sincronizado', g->>'jid', p_numero, now(),
              (g->>'so_admins')::boolean)
      returning id into v_id;
    else
      update public.ofe_grupos
         set nome = left(coalesce(nullif(g->>'nome', ''), nome), 120),
             numero_coletor_id = coalesce(numero_coletor_id, p_numero),
             coleta_iniciada_em = coalesce(coleta_iniciada_em, now()),
             so_admins = coalesce((g->>'so_admins')::boolean, so_admins)
       where id = v_id
         and (nome is distinct from left(coalesce(nullif(g->>'nome', ''), nome), 120)
              or numero_coletor_id is null or coleta_iniciada_em is null
              or so_admins is distinct from coalesce((g->>'so_admins')::boolean, so_admins));
    end if;
    insert into public.ofe_grupos_numeros (grupo_id, numero_id, admin, visto_em)
    values (v_id, p_numero, coalesce((g->>'admin')::boolean, false), now())
    on conflict (grupo_id, numero_id) do update set admin = excluded.admin, visto_em = now();
    v_membros := (g->>'membros')::integer;
    if v_membros is not null and v_membros >= 0 then
      select membros, medido_em into v_ultima from public.ofe_grupos_medicoes where grupo_id = v_id order by medido_em desc limit 1;
      if not found or v_ultima.membros <> v_membros or v_ultima.medido_em < now() - interval '6 hours' then
        insert into public.ofe_grupos_medicoes (grupo_id, membros, origem) values (v_id, v_membros, 'sincronizacao');
      end if;
    end if;
    n := n + 1;
  end loop;
  update public.ofe_numeros_estado set ultima_sincronizacao_em = now(), atualizado_em = now() where numero_id = p_numero;
  return n;
end $$;

-- Entrada ou saída observada. Só o número coletor do grupo registra (sem contagem dupla).
create or replace function public.ofe_w_evento_grupo(p_numero uuid, p_jid text, p_tipo text, p_quantidade integer) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_ultima integer;
begin
  if p_tipo not in ('entrada', 'saida') or coalesce(p_quantidade, 0) <= 0 then return; end if;
  select id into v_id from public.ofe_grupos where jid = p_jid and numero_coletor_id = p_numero;
  if v_id is null then return; end if;
  insert into public.ofe_grupos_eventos (grupo_id, tipo, quantidade) values (v_id, p_tipo, p_quantidade);
  select membros into v_ultima from public.ofe_grupos_medicoes where grupo_id = v_id order by medido_em desc limit 1;
  if v_ultima is not null then
    insert into public.ofe_grupos_medicoes (grupo_id, membros, origem)
    values (v_id, greatest(0, v_ultima + case p_tipo when 'entrada' then p_quantidade else -p_quantidade end), 'evento');
  end if;
end $$;

-- Remoção pedida pelo dono: o worker apaga a sessão depois do logout.
create or replace function public.ofe_w_apagar_sessao(p_numero uuid) returns void
language sql security invoker set search_path = public, pg_temp as $$
  delete from public.ofe_sessoes where numero_id = p_numero;
  delete from public.ofe_qr where numero_id = p_numero;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'ofe_w_batimento(text, text)', 'ofe_w_assumir_numero(uuid, text, integer)', 'ofe_w_liberar_numero(uuid, text)',
    'ofe_w_proximo_comando(text)', 'ofe_w_concluir_comando(uuid, boolean, text)',
    'ofe_w_estado(uuid, text, text, text, text, text)', 'ofe_w_lacuna_desde(uuid, timestamptz, text)',
    'ofe_w_evento_numero(uuid, text, text)', 'ofe_w_qr(uuid, text, text, integer)',
    'ofe_w_sincronizar_grupos(uuid, jsonb)', 'ofe_w_evento_grupo(uuid, text, text, integer)', 'ofe_w_apagar_sessao(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to ofe_worker, service_role', f);
  end loop;
end $$;

grant select on public.ofe_numeros to ofe_worker;
grant select, insert, update on public.ofe_numeros_estado to ofe_worker;
grant select, insert, update, delete on public.ofe_sessoes, public.ofe_qr to ofe_worker;
grant select, update on public.ofe_comandos to ofe_worker;
grant select, insert on public.ofe_numeros_eventos, public.ofe_grupos_eventos, public.ofe_grupos_medicoes to ofe_worker;
grant select, insert, update on public.ofe_worker_estado, public.ofe_coleta_lacunas, public.ofe_grupos_numeros to ofe_worker;
grant select, insert, update on public.ofe_grupos to ofe_worker;
grant select on public.ofe_grupos_resumo to ofe_worker;
create policy ofe_numeros_worker on public.ofe_numeros for select to ofe_worker using (true);
create policy ofe_numeros_estado_worker on public.ofe_numeros_estado for all to ofe_worker using (true) with check (true);
create policy ofe_sessoes_worker on public.ofe_sessoes for all to ofe_worker using (true) with check (true);
create policy ofe_qr_worker on public.ofe_qr for all to ofe_worker using (true) with check (true);
create policy ofe_comandos_worker on public.ofe_comandos for all to ofe_worker using (true) with check (true);
create policy ofe_numeros_eventos_worker on public.ofe_numeros_eventos for all to ofe_worker using (true) with check (true);
create policy ofe_worker_estado_worker on public.ofe_worker_estado for all to ofe_worker using (true) with check (true);
create policy ofe_coleta_lacunas_worker on public.ofe_coleta_lacunas for all to ofe_worker using (true) with check (true);
create policy ofe_grupos_numeros_worker on public.ofe_grupos_numeros for all to ofe_worker using (true) with check (true);
create policy ofe_grupos_medicoes_worker on public.ofe_grupos_medicoes for all to ofe_worker using (true) with check (true);
create policy ofe_grupos_eventos_worker on public.ofe_grupos_eventos for all to ofe_worker using (true) with check (true);
grant usage, select on all sequences in schema public to ofe_worker;

-- Alertas: número com automação aceita fora do ar e worker sem batimento há 5 minutos.
create or replace function app.ofe_alertas_devidos()
returns table (tipo text, severidade text, titulo text, descricao text, entidade_tipo text, entidade_id uuid)
language sql stable set search_path = public, pg_temp as $$
  select 'ofe_integracao_erro'::text, 'atencao'::text,
         'Integração com ' || app.ofe_rotulo_plataforma(i.plataforma) || ': ' ||
           case i.status when 'credencial_expirada' then 'credencial expirada' else 'erro' end,
         coalesce(i.ultimo_erro, 'Abra Grupos de Ofertas > Integrações de afiliados e teste a conexão.'),
         'ofe_integracao'::text, i.id
    from public.ofe_integracoes i
   where i.status in ('erro', 'credencial_expirada')
  union all
  select 'ofe_publicacao_atrasada', 'info',
         count(*) || ' publicação(ões) manual(is) esperando há mais de 2 horas',
         'Abra Grupos de Ofertas > Publicar.', 'ofe_publicacao', null::uuid
    from public.ofe_envios e
   where e.modo = 'manual' and e.status = 'aguardando' and e.agendado_para < now() - interval '2 hours'
  having count(*) > 0
  union all
  select 'ofe_numero_desconectado', 'atencao', 'Número desconectado: ' || n.rotulo,
         coalesce(es.ultimo_erro, 'Os envios automáticos deste número ficam esperando. Reconecte em Números de WhatsApp.'),
         'ofe_numero', n.id
    from public.ofe_numeros n join public.ofe_numeros_estado es on es.numero_id = n.id
   where n.ativo and n.aceite_risco_em is not null and es.jid_proprio is not null
     and es.status in ('desconectado', 'erro') and es.atualizado_em < now() - interval '5 minutes'
  union all
  select 'ofe_worker_parado', 'critico', 'Worker do WhatsApp sem sinal',
         'Nenhum batimento há mais de 5 minutos. Envios automáticos e coleta de grupos estão parados.', 'ofe_worker', null::uuid
   where exists (select 1 from public.ofe_numeros n join public.ofe_numeros_estado es on es.numero_id = n.id
                  where n.ativo and n.aceite_risco_em is not null and es.jid_proprio is not null)
     and not exists (select 1 from public.ofe_worker_estado w where w.ultimo_batimento_em > now() - interval '5 minutes');
$$;
revoke execute on function app.ofe_alertas_devidos() from public, anon, authenticated;
