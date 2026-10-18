-- 0021: Grupos de Ofertas, fundação. Integrações de afiliado (identificadores públicos à vista,
-- segredo cifrado pela aplicação numa tabela que nenhum usuário lê), modelos de mensagem,
-- alertas do módulo e o papel de banco do worker do WhatsApp (sem service role).

-- Papel do worker: entra pelo pooler com senha definida fora do repositório
-- (alter role ofe_worker login password ...). Só recebe grant explícito nas tabelas ofe_*.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'ofe_worker') then
    create role ofe_worker nologin noinherit;
  end if;
end $$;
grant usage on schema public, app to ofe_worker;

-- Origem 'worker' na auditoria quando a conexão é do papel do worker.
create or replace function app.origem_atual() returns text
language plpgsql stable as $$
declare
  cabecalhos json;
  origem text;
begin
  if session_user = 'ofe_worker' then return 'worker'; end if;
  begin
    cabecalhos := current_setting('request.headers', true)::json;
  exception when others then
    cabecalhos := null;
  end;
  if cabecalhos is null then return 'script'; end if;
  origem := cabecalhos ->> 'x-origem';
  if origem in ('web', 'mcp', 'script', 'importacao') then return origem; end if;
  return 'web';
end $$;

create or replace function app.ofe_rotulo_plataforma(p text) returns text
language sql immutable as $$
  select case p when 'shopee' then 'Shopee' when 'mercado_livre' then 'Mercado Livre'
    when 'amazon' then 'Amazon' when 'awin' then 'Awin' else p end;
$$;

-- Uma linha por plataforma, criada aqui. identificadores: só valores públicos (AppID, publisher,
-- tag de associado, IDs de rastreamento). recursos: o que o último teste real confirmou.
create table public.ofe_integracoes (
  id uuid primary key default gen_random_uuid(),
  plataforma text not null unique check (plataforma in ('shopee', 'mercado_livre', 'amazon', 'awin')),
  status text not null default 'nao_configurada' check (status in (
    'nao_configurada', 'aguardando_autorizacao', 'conectada', 'erro', 'credencial_expirada', 'indisponivel')),
  identificadores jsonb not null default '{}'::jsonb check (jsonb_typeof(identificadores) = 'object'),
  recursos jsonb not null default '{}'::jsonb check (jsonb_typeof(recursos) = 'object'),
  segredo_configurado_em timestamptz,
  testado_em timestamptz,
  ultimo_erro text check (char_length(ultimo_erro) <= 500),
  ultimo_erro_em timestamptz,
  -- Trava de conformidade: canal WhatsApp cadastrado ou confirmado no programa de afiliados.
  conformidade_em timestamptz,
  conformidade_por uuid references public.usuarios_app (id),
  conformidade_observacao text check (char_length(conformidade_observacao) <= 500),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
insert into public.ofe_integracoes (plataforma, status) values
  ('shopee', 'nao_configurada'), ('mercado_livre', 'nao_configurada'),
  ('amazon', 'nao_configurada'), ('awin', 'nao_configurada');
create trigger ofe_integracoes_atualizado before update on public.ofe_integracoes
  for each row execute function app.carimbar_atualizacao();
create trigger ofe_integracoes_auditoria after insert or update or delete on public.ofe_integracoes
  for each row execute function app.auditar();
alter table public.ofe_integracoes enable row level security;
create policy ofe_integracoes_ler on public.ofe_integracoes for select to authenticated
  using (app.usuario_ativo());
create policy ofe_integracoes_alterar on public.ofe_integracoes for update to authenticated
  using (app.eh_dono()) with check (app.eh_dono());
grant select, update (status, recursos, ultimo_erro, ultimo_erro_em) on public.ofe_integracoes to ofe_worker;
create policy ofe_integracoes_worker on public.ofe_integracoes for all to ofe_worker using (true) with check (true);

-- Segredos (JSON com os campos secretos da plataforma), cifrados em AES-256-GCM pela aplicação.
-- Sem policy para authenticated e sem grant: nem o dono lê pela sessão. Grava só por rpc do dono;
-- lê só a service role (src/integracoes/credenciais.ts) e o worker.
create table public.ofe_integracoes_segredos (
  integracao_id uuid primary key references public.ofe_integracoes (id) on delete cascade,
  segredo text not null check (char_length(segredo) <= 8000 and segredo like 'v1.%'),
  chave_id text not null check (char_length(chave_id) between 1 and 16),
  salvo_em timestamptz not null default now(),
  salvo_por uuid
);
alter table public.ofe_integracoes_segredos enable row level security;
revoke all on public.ofe_integracoes_segredos from anon, authenticated;
grant select on public.ofe_integracoes_segredos to ofe_worker;
create policy ofe_segredos_worker on public.ofe_integracoes_segredos for select to ofe_worker using (true);

create or replace function public.ofe_salvar_segredo(p_plataforma text, p_segredo text, p_chave_id text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if not app.eh_dono() then raise exception 'sem_permissao'; end if;
  if p_segredo is null or p_segredo not like 'v1.%' or char_length(p_segredo) > 8000 then
    raise exception 'segredo_invalido';
  end if;
  select id into v_id from public.ofe_integracoes where plataforma = p_plataforma;
  if v_id is null then raise exception 'nao_encontrado'; end if;
  insert into public.ofe_integracoes_segredos (integracao_id, segredo, chave_id, salvo_em, salvo_por)
  values (v_id, p_segredo, p_chave_id, now(), auth.uid())
  on conflict (integracao_id) do update
    set segredo = excluded.segredo, chave_id = excluded.chave_id, salvo_em = now(), salvo_por = auth.uid();
  update public.ofe_integracoes set segredo_configurado_em = now() where id = v_id;
end $$;
revoke execute on function public.ofe_salvar_segredo(text, text, text) from public, anon;
grant execute on function public.ofe_salvar_segredo(text, text, text) to authenticated;

create or replace function public.ofe_remover_segredo(p_plataforma text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if not app.eh_dono() then raise exception 'sem_permissao'; end if;
  select id into v_id from public.ofe_integracoes where plataforma = p_plataforma;
  if v_id is null then raise exception 'nao_encontrado'; end if;
  delete from public.ofe_integracoes_segredos where integracao_id = v_id;
  update public.ofe_integracoes
     set segredo_configurado_em = null, status = 'nao_configurada', recursos = '{}'::jsonb,
         testado_em = null, ultimo_erro = null, ultimo_erro_em = null
   where id = v_id;
end $$;
revoke execute on function public.ofe_remover_segredo(text) from public, anon;
grant execute on function public.ofe_remover_segredo(text) to authenticated;

-- Modelos de mensagem. Variáveis {{nome}} e seções {{#nome}}...{{/nome}} (só aparecem com dado).
create table public.ofe_modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 80),
  tipo text not null check (tipo in ('oferta', 'cupom')),
  plataforma text check (plataforma in ('shopee', 'mercado_livre', 'amazon', 'awin')),
  corpo text not null check (char_length(corpo) between 1 and 4000),
  padrao boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index ofe_modelos_um_padrao on public.ofe_modelos (tipo, plataforma) nulls not distinct where padrao;
create trigger ofe_modelos_atualizado before update on public.ofe_modelos
  for each row execute function app.carimbar_atualizacao();
create trigger ofe_modelos_auditoria after insert or update or delete on public.ofe_modelos
  for each row execute function app.auditar();
alter table public.ofe_modelos enable row level security;
create policy ofe_modelos_ler on public.ofe_modelos for select to authenticated using (app.usuario_ativo());
create policy ofe_modelos_escrever on public.ofe_modelos for all to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());
grant select on public.ofe_modelos to ofe_worker;
create policy ofe_modelos_worker on public.ofe_modelos for select to ofe_worker using (true);

insert into public.ofe_modelos (nome, tipo, plataforma, corpo, padrao) values
('Oferta padrão', 'oferta', null,
'*{{produto}}*
{{#preco_anterior}}De {{preco_anterior}} por {{/preco_anterior}}{{#preco_atual}}{{preco_atual}}{{/preco_atual}}{{#desconto}} ({{desconto}} de desconto){{/desconto}}
{{#cupom}}Cupom {{cupom}}{{#cupom_beneficio}}: {{cupom_beneficio}}{{/cupom_beneficio}}{{#validade_cupom}}, válido até {{validade_cupom}}{{/validade_cupom}}{{/cupom}}
{{#cta}}{{cta}}{{/cta}}
{{#atualizado_em}}Preço consultado em {{atualizado_em}}. Pode mudar sem aviso.{{/atualizado_em}}

{{marketplace}}: {{link}}', true),
('Oferta Amazon', 'oferta', 'amazon',
'*{{produto}}*
{{#preco_atual}}{{preco_atual}}{{/preco_atual}}{{#desconto}} ({{desconto}} de desconto){{/desconto}}
{{#cupom}}Cupom {{cupom}}{{#validade_cupom}}, válido até {{validade_cupom}}{{/validade_cupom}}{{/cupom}}
Preço consultado em {{atualizado_em}}. Preço e disponibilidade podem mudar.

Amazon: {{link}}', true),
('Cupom padrão', 'cupom', null,
'*Cupom {{marketplace}}: {{cupom}}*
{{#cupom_beneficio}}{{cupom_beneficio}}{{/cupom_beneficio}}
{{#cupom_regras}}{{cupom_regras}}{{/cupom_regras}}
{{#validade_cupom}}Válido até {{validade_cupom}}.{{/validade_cupom}}
{{#link}}{{link}}{{/link}}', true);

-- Alertas do módulo: lista do que deveria estar aberto agora. As próximas migrações trocam esta
-- função (create or replace) para acrescentar fontes; ofe_gerar_alertas abre, atualiza e resolve.
create or replace function app.ofe_alertas_devidos()
returns table (tipo text, severidade text, titulo text, descricao text, entidade_tipo text, entidade_id uuid)
language sql stable set search_path = public, pg_temp as $$
  select 'ofe_integracao_erro'::text, 'atencao'::text,
         'Integração com ' || app.ofe_rotulo_plataforma(i.plataforma) || ': ' ||
           case i.status when 'credencial_expirada' then 'credencial expirada' else 'erro' end,
         coalesce(i.ultimo_erro, 'Abra Grupos de Ofertas > Integrações de afiliados e teste a conexão.'),
         'ofe_integracao'::text, i.id
    from public.ofe_integracoes i
   where i.status in ('erro', 'credencial_expirada');
$$;
revoke execute on function app.ofe_alertas_devidos() from public, anon, authenticated;

create or replace function public.ofe_gerar_alertas() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_abertos integer := 0;
  v_atualizados integer := 0;
  v_resolvidos integer := 0;
begin
  if auth.uid() is not null and not app.pode_escrever() then raise exception 'sem_permissao'; end if;

  insert into public.alertas (tipo, severidade, titulo, descricao, entidade_tipo, entidade_id)
  select a.tipo, a.severidade, a.titulo, a.descricao, a.entidade_tipo, a.entidade_id
    from app.ofe_alertas_devidos() a
   where not exists (select 1 from public.alertas x where x.tipo = a.tipo
       and x.entidade_tipo is not distinct from a.entidade_tipo
       and x.entidade_id is not distinct from a.entidade_id and x.resolvido_em is null);
  get diagnostics v_abertos = row_count;

  update public.alertas x set titulo = a.titulo, descricao = a.descricao, severidade = a.severidade
    from app.ofe_alertas_devidos() a
   where x.tipo = a.tipo and x.entidade_tipo is not distinct from a.entidade_tipo
     and x.entidade_id is not distinct from a.entidade_id and x.resolvido_em is null
     and (x.titulo <> a.titulo or x.descricao is distinct from a.descricao or x.severidade <> a.severidade);
  get diagnostics v_atualizados = row_count;

  update public.alertas x set resolvido_em = now()
   where x.resolvido_em is null and x.tipo like 'ofe\_%' escape '\'
     and not exists (select 1 from app.ofe_alertas_devidos() a where a.tipo = x.tipo
       and a.entidade_tipo is not distinct from x.entidade_tipo
       and a.entidade_id is not distinct from x.entidade_id);
  get diagnostics v_resolvidos = row_count;

  return jsonb_build_object('abertos', v_abertos, 'atualizados', v_atualizados, 'resolvidos', v_resolvidos, 'em', now());
end $$;
revoke execute on function public.ofe_gerar_alertas() from public, anon;
grant execute on function public.ofe_gerar_alertas() to authenticated, service_role, ofe_worker;

-- A cada 10 minutos (worker parado e envio falho precisam de resposta no mesmo dia), e limpeza
-- diária do histórico do pg_cron, que não se limpa sozinho.
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'ofe-alertas';
  perform cron.schedule('ofe-alertas', '*/10 * * * *', 'select public.ofe_gerar_alertas()');
  perform cron.unschedule(jobid) from cron.job where jobname = 'ofe-limpeza-cron';
  perform cron.schedule('ofe-limpeza-cron', '30 6 * * *',
    $c$delete from cron.job_run_details where end_time < now() - interval '7 days'$c$);
exception when others then
  raise notice 'agendamento nao criado: %', sqlerrm;
end $$;
