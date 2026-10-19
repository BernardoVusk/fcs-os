-- 0025: Grupos de Ofertas, filas e despacho. Fila (remetente manual ou número, cadência, janela,
-- reinício diário), destinos, itens, publicações criadas na hora (uma por item e rodada),
-- preparação (texto e link por grupo, feita em TypeScript pelo worker ou pelo ERP), reserva com
-- skip locked, conclusão com retentativa e estado incerto, e rotina diária.

-- Correção da 0024: o worker não precisa de sequências (colunas identidade bastam com insert).
revoke usage, select on all sequences in schema public from ofe_worker;

-- Imagens de oferta existem para ser publicadas em grupo: o bucket fica público (sem listagem)
-- para o worker baixar sem service role. Caminho com carimbo de tempo; escrita continua restrita.
update storage.buckets set public = true where id = 'ofertas-imagens';

create table public.ofe_filas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 80),
  numero_id uuid references public.ofe_numeros (id) on delete set null,
  modelo_id uuid references public.ofe_modelos (id) on delete set null,
  intervalo_segundos integer not null default 900 check (intervalo_segundos between 60 and 86400),
  janela_inicio time not null default '08:00',
  janela_fim time not null default '22:00',
  inicio_em timestamptz,
  reinicio_diario boolean not null default false,
  manual_expira_horas integer not null default 6 check (manual_expira_horas between 1 and 72),
  rodada integer not null default 0 check (rodada >= 0),
  rodada_data date,
  status text not null default 'rascunho' check (status in ('rascunho', 'ativa', 'pausada', 'encerrada')),
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (janela_fim > janela_inicio)
);
create trigger ofe_filas_atualizado before update on public.ofe_filas
  for each row execute function app.carimbar_atualizacao();
create trigger ofe_filas_auditoria after insert or update or delete on public.ofe_filas
  for each row execute function app.auditar();
alter table public.ofe_filas enable row level security;
create policy ofe_filas_ler on public.ofe_filas for select to authenticated using (app.usuario_ativo());
create policy ofe_filas_escrever on public.ofe_filas for all to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());

create table public.ofe_filas_destinos (
  fila_id uuid not null references public.ofe_filas (id) on delete cascade,
  grupo_id uuid not null references public.ofe_grupos (id) on delete cascade,
  primary key (fila_id, grupo_id)
);
alter table public.ofe_filas_destinos enable row level security;
create policy ofe_filas_destinos_ler on public.ofe_filas_destinos for select to authenticated using (app.usuario_ativo());
create policy ofe_filas_destinos_escrever on public.ofe_filas_destinos for all to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());

create table public.ofe_filas_itens (
  id uuid primary key default gen_random_uuid(),
  fila_id uuid not null references public.ofe_filas (id) on delete cascade,
  oferta_id uuid references public.ofe_ofertas (id) on delete cascade,
  cupom_id uuid references public.ofe_cupons (id) on delete cascade,
  posicao integer not null default 0,
  texto_editado text check (char_length(texto_editado) <= 4000),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  check (num_nonnulls(oferta_id, cupom_id) = 1)
);
create index ofe_filas_itens_ordem on public.ofe_filas_itens (fila_id, posicao, criado_em);
create trigger ofe_filas_itens_auditoria after insert or update or delete on public.ofe_filas_itens
  for each row execute function app.auditar();
alter table public.ofe_filas_itens enable row level security;
create policy ofe_filas_itens_ler on public.ofe_filas_itens for select to authenticated using (app.usuario_ativo());
create policy ofe_filas_itens_escrever on public.ofe_filas_itens for all to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());

alter table public.ofe_publicacoes
  add column fila_id uuid references public.ofe_filas (id) on delete set null,
  add column fila_item_id uuid references public.ofe_filas_itens (id) on delete set null,
  add column rodada integer;
create unique index ofe_publicacoes_rodada on public.ofe_publicacoes (fila_item_id, rodada) where fila_item_id is not null;
create index ofe_publicacoes_fila on public.ofe_publicacoes (fila_id, criado_em desc) where fila_id is not null;

-- Um envio em andamento por número (o WhatsApp recebe uma mensagem por vez de cada sessão).
create unique index ofe_envios_um_por_numero on public.ofe_envios (numero_id) where status = 'processando';

create table public.ofe_envios_tentativas (
  id bigint generated always as identity primary key,
  envio_id uuid not null references public.ofe_envios (id) on delete cascade,
  worker_id text check (char_length(worker_id) <= 80),
  iniciado_em timestamptz not null default now(),
  terminado_em timestamptz,
  resultado text check (resultado in ('enviado', 'erro_antes', 'incerto', 'falha_definitiva', 'reserva_vencida')),
  erro text check (char_length(erro) <= 300)
);
create index ofe_envios_tentativas_envio on public.ofe_envios_tentativas (envio_id, iniciado_em desc);
create index ofe_envios_tentativas_data on public.ofe_envios_tentativas (iniciado_em);
alter table public.ofe_envios_tentativas enable row level security;
create policy ofe_tentativas_ler on public.ofe_envios_tentativas for select to authenticated using (app.usuario_ativo());

-- Avança as filas ativas: no máximo uma publicação por vez por fila, na ordem dos itens, depois do
-- intervalo e dentro da janela (horário de São Paulo). Envios nascem sem texto: a preparação em
-- TypeScript monta link e texto. Plataforma bloqueada ou cupom vencido viram envio ignorado.
create or replace function public.ofe_avancar_filas() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  f record;
  it record;
  v_ultima record;
  v_pub uuid;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_hora time := (now() at time zone 'America/Sao_Paulo')::time;
  v_plataforma text;
  v_motivo text;
  n integer := 0;
begin
  if auth.uid() is not null and not app.pode_escrever() then raise exception 'sem_permissao'; end if;

  -- Envio manual não publicado a tempo deixa de esperar.
  update public.ofe_envios e set status = 'ignorado', motivo = 'nao_publicado_a_tempo'
    from public.ofe_publicacoes p join public.ofe_filas fl on fl.id = p.fila_id
   where e.publicacao_id = p.id and e.modo = 'manual' and e.status = 'aguardando'
     and e.agendado_para < now() - make_interval(hours => fl.manual_expira_horas);

  for f in select * from public.ofe_filas where status = 'ativa' order by criado_em loop
    if f.inicio_em is not null and f.inicio_em > now() then continue; end if;
    if v_hora < f.janela_inicio or v_hora >= f.janela_fim then continue; end if;

    select p.id, p.agendado_para,
           exists (select 1 from public.ofe_envios e where e.publicacao_id = p.id and e.status in ('aguardando', 'processando')) as aberta
      into v_ultima
      from public.ofe_publicacoes p where p.fila_id = f.id order by p.criado_em desc limit 1;
    if v_ultima.id is not null and (v_ultima.aberta or v_ultima.agendado_para > now() - make_interval(secs => f.intervalo_segundos)) then
      continue;
    end if;

    if f.rodada = 0 then
      update public.ofe_filas set rodada = 1, rodada_data = v_hoje where id = f.id;
      f.rodada := 1;
      f.rodada_data := v_hoje;
    end if;

    select i.* into it from public.ofe_filas_itens i
     where i.fila_id = f.id and i.ativo
       and not exists (select 1 from public.ofe_publicacoes p where p.fila_item_id = i.id and p.rodada = f.rodada)
     order by i.posicao, i.criado_em limit 1;

    if it.id is null then
      if f.reinicio_diario and f.rodada_data < v_hoje then
        update public.ofe_filas set rodada = rodada + 1, rodada_data = v_hoje where id = f.id;
      elsif not f.reinicio_diario then
        update public.ofe_filas set status = 'encerrada' where id = f.id;
      end if;
      continue;
    end if;

    if not exists (
      select 1 from public.ofe_filas_destinos d join public.ofe_grupos g on g.id = d.grupo_id
       where d.fila_id = f.id and g.ativo and g.funcao in ('destino', 'teste')
    ) then
      continue;
    end if;

    if it.oferta_id is not null then
      select plataforma into v_plataforma from public.ofe_ofertas where id = it.oferta_id;
    else
      select plataforma into v_plataforma from public.ofe_cupons where id = it.cupom_id;
    end if;
    v_motivo := null;
    if not exists (select 1 from public.ofe_integracoes where plataforma = v_plataforma and conformidade_em is not null) then
      v_motivo := 'plataforma_bloqueada';
    elsif it.cupom_id is not null and not app.ofe_cupom_vigente(it.cupom_id) then
      v_motivo := 'cupom_fora_da_vigencia';
    end if;

    insert into public.ofe_publicacoes (oferta_id, cupom_id, origem, modo, numero_id, agendado_para, texto_editado, fila_id, fila_item_id, rodada, criado_por)
    values (it.oferta_id, it.cupom_id, 'fila', case when f.numero_id is null then 'manual' else 'automatico' end, f.numero_id,
            now(), it.texto_editado, f.id, it.id, f.rodada, f.criado_por)
    returning id into v_pub;

    insert into public.ofe_envios (publicacao_id, grupo_id, modo, numero_id, agendado_para, status, motivo)
    select v_pub, d.grupo_id, case when f.numero_id is null then 'manual' else 'automatico' end, f.numero_id, now(),
           case when v_motivo is null then 'aguardando' else 'ignorado' end, v_motivo
      from public.ofe_filas_destinos d join public.ofe_grupos g on g.id = d.grupo_id
     where d.fila_id = f.id and g.ativo and g.funcao in ('destino', 'teste');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.ofe_avancar_filas() from public, anon;
grant execute on function public.ofe_avancar_filas() to authenticated, service_role, ofe_worker;

-- Preparação feita fora do banco (conversão de link por API). Grava texto e link de um envio.
create or replace function public.ofe_preparar_envio(
  p_envio uuid, p_texto text, p_link text, p_origem text, p_motivo text default null, p_detalhe text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is not null and not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  if p_motivo is not null then
    update public.ofe_envios set status = 'falhou', motivo = left(p_motivo, 60), erro_detalhe = left(p_detalhe, 500)
     where id = p_envio and status = 'aguardando' and preparado_em is null;
    return;
  end if;
  if coalesce(p_texto, '') = '' then raise exception 'envio_sem_texto'; end if;
  update public.ofe_envios
     set texto_final = left(p_texto, 4096), link_url = p_link, link_origem = p_origem, preparado_em = now()
   where id = p_envio and status = 'aguardando' and preparado_em is null;
end $$;
revoke execute on function public.ofe_preparar_envio(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.ofe_preparar_envio(uuid, text, text, text, text, text) to authenticated, ofe_worker;

-- Reserva de um envio automático para este worker: recupera reservas vencidas (sem despacho
-- iniciado volta a esperar; com despacho iniciado vira incerto e não é reenviado sozinho) e pega
-- o próximo que cumpre número conectado com este worker, janela, intervalo, limites e cupom.
create or replace function public.ofe_reservar_envio(p_worker text)
returns table (
  envio_id uuid, publicacao_id uuid, numero_id uuid, grupo_jid text, texto text, link_url text,
  imagem_caminho text, imagem_url text, plataforma text
)
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  update public.ofe_envios
     set status = case when despacho_iniciado_em is null then 'aguardando' else 'incerto' end,
         motivo = case when despacho_iniciado_em is null then motivo else 'resultado_desconhecido' end,
         reservado_por = null, reservado_ate = null
   where status = 'processando' and reservado_ate < now();
  update public.ofe_envios_tentativas t set terminado_em = now(), resultado = 'reserva_vencida'
   where t.terminado_em is null and t.iniciado_em < now() - interval '3 minutes';

  select e.id into v_id
    from public.ofe_envios e
    join public.ofe_publicacoes p on p.id = e.publicacao_id
    join public.ofe_numeros n on n.id = e.numero_id
    join public.ofe_numeros_estado s on s.numero_id = n.id
    join public.ofe_grupos g on g.id = e.grupo_id
    left join public.ofe_filas f on f.id = p.fila_id
   where e.status = 'aguardando' and e.modo = 'automatico' and e.preparado_em is not null
     and e.agendado_para <= now() and (e.proxima_tentativa_em is null or e.proxima_tentativa_em <= now())
     and s.status = 'conectado' and s.worker_id = p_worker and s.trava_ate > now()
     and n.ativo and n.aceite_risco_em is not null
     and g.ativo and g.jid is not null
     and (f.id is null or f.status = 'ativa')
     and (now() at time zone 'America/Sao_Paulo')::time >= n.janela_inicio
     and (now() at time zone 'America/Sao_Paulo')::time < n.janela_fim
     and not exists (select 1 from public.ofe_envios x where x.numero_id = e.numero_id and x.status = 'processando')
     and (select count(*) from public.ofe_envios x where x.numero_id = e.numero_id and x.status in ('enviado', 'incerto')
           and coalesce(x.enviado_em, x.despacho_iniciado_em, x.atualizado_em) > now() - interval '1 hour') < n.limite_por_hora
     and (select count(*) from public.ofe_envios x where x.numero_id = e.numero_id and x.status in ('enviado', 'incerto')
           and coalesce(x.enviado_em, x.despacho_iniciado_em, x.atualizado_em) > now() - interval '1 day') < n.limite_por_dia
     and coalesce((select max(coalesce(x.enviado_em, x.despacho_iniciado_em)) from public.ofe_envios x
                    where x.numero_id = e.numero_id and x.status in ('enviado', 'incerto')), '-infinity'::timestamptz)
         <= now() - make_interval(secs => n.intervalo_min_segundos)
     and (p.cupom_id is null or app.ofe_cupom_vigente(p.cupom_id))
   order by e.agendado_para, e.criado_em
   limit 1
   for update of e skip locked;
  if v_id is null then return; end if;

  update public.ofe_envios
     set status = 'processando', reservado_por = p_worker, reservado_ate = now() + interval '2 minutes',
         tentativas = tentativas + 1, despacho_iniciado_em = null
   where id = v_id and status = 'aguardando';
  if not found then return; end if;
  insert into public.ofe_envios_tentativas (envio_id, worker_id) values (v_id, p_worker);

  return query
  select e.id, e.publicacao_id, e.numero_id, g.jid, e.texto_final, e.link_url,
         o.imagem_caminho, o.imagem_url, coalesce(o.plataforma, c.plataforma)
    from public.ofe_envios e
    join public.ofe_publicacoes p on p.id = e.publicacao_id
    join public.ofe_grupos g on g.id = e.grupo_id
    left join public.ofe_ofertas o on o.id = p.oferta_id
    left join public.ofe_cupons c on c.id = p.cupom_id
   where e.id = v_id;
end $$;

-- Grava o início do despacho antes de mandar pelo socket: reserva vencida depois disso é incerta.
create or replace function public.ofe_marcar_despacho(p_envio uuid, p_worker text) returns boolean
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  update public.ofe_envios set despacho_iniciado_em = now()
   where id = p_envio and status = 'processando' and reservado_por = p_worker and despacho_iniciado_em is null;
  return found;
end $$;

-- Resultado: enviado; erro antes do despacho (volta com espera 1, 5, 15 min, até 3 tentativas);
-- incerto (não reenvia sozinho); falha definitiva (grupo inexistente, sem permissão de envio).
create or replace function public.ofe_concluir_envio(
  p_envio uuid, p_worker text, p_resultado text, p_wa_id text default null, p_erro text default null
) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_tent integer;
begin
  select tentativas into v_tent from public.ofe_envios where id = p_envio and status = 'processando' and reservado_por = p_worker;
  if not found then return; end if;
  if p_resultado = 'enviado' then
    update public.ofe_envios set status = 'enviado', enviado_em = now(), wa_mensagem_id = left(p_wa_id, 120), motivo = null,
           erro_detalhe = null, reservado_por = null, reservado_ate = null
     where id = p_envio;
  elsif p_resultado = 'erro_antes' then
    update public.ofe_envios
       set status = case when v_tent >= 3 then 'falhou' else 'aguardando' end,
           motivo = case when v_tent >= 3 then 'falha_envio' else motivo end,
           proxima_tentativa_em = now() + case v_tent when 1 then interval '1 minute' when 2 then interval '5 minutes' else interval '15 minutes' end,
           erro_detalhe = left(p_erro, 500), reservado_por = null, reservado_ate = null, despacho_iniciado_em = null
     where id = p_envio;
  elsif p_resultado = 'incerto' then
    update public.ofe_envios set status = 'incerto', motivo = 'resultado_desconhecido', erro_detalhe = left(p_erro, 500),
           reservado_por = null, reservado_ate = null
     where id = p_envio;
  else
    update public.ofe_envios set status = 'falhou', motivo = 'falha_envio', erro_detalhe = left(p_erro, 500),
           reservado_por = null, reservado_ate = null
     where id = p_envio;
  end if;
  update public.ofe_envios_tentativas set terminado_em = now(), resultado = p_resultado, erro = left(p_erro, 300)
   where id = (select id from public.ofe_envios_tentativas where envio_id = p_envio and terminado_em is null order by iniciado_em desc limit 1);
end $$;

-- Envios automáticos para preparar (deste worker, vencendo nos próximos 10 minutos).
create or replace function public.ofe_w_para_preparar(p_worker text, p_limite integer default 5)
returns setof uuid
language sql security invoker set search_path = public, pg_temp as $$
  select e.id from public.ofe_envios e
    join public.ofe_numeros_estado s on s.numero_id = e.numero_id
   where e.status = 'aguardando' and e.modo = 'automatico' and e.preparado_em is null
     and e.agendado_para <= now() + interval '10 minutes' and s.worker_id = p_worker
   order by e.agendado_para limit p_limite;
$$;

-- Dados do produto atualizados pela Open API da Shopee antes do envio (só campos da API).
create or replace function public.ofe_w_atualizar_oferta(
  p_oferta uuid, p_titulo text, p_imagem text, p_preco numeric, p_desconto numeric, p_avaliacao numeric, p_variavel boolean, p_fontes jsonb
) returns void
language sql security invoker set search_path = public, pg_temp as $$
  update public.ofe_ofertas
     set titulo = coalesce(p_titulo, titulo), imagem_url = coalesce(p_imagem, imagem_url), preco_atual = p_preco,
         desconto = p_desconto, avaliacao = coalesce(p_avaliacao, avaliacao), preco_variavel = coalesce(p_variavel, preco_variavel),
         fontes = fontes || coalesce(p_fontes, '{}'::jsonb), dados_atualizados_em = now()
   where id = p_oferta;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'ofe_reservar_envio(text)', 'ofe_marcar_despacho(uuid, text)', 'ofe_concluir_envio(uuid, text, text, text, text)',
    'ofe_w_para_preparar(text, integer)',
    'ofe_w_atualizar_oferta(uuid, text, text, numeric, numeric, numeric, boolean, jsonb)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to ofe_worker, service_role', f);
  end loop;
end $$;

-- Ações da tela sobre falhas e incertos (só quem escreve; incerto pede conferência no grupo).
create or replace function public.ofe_reenviar(p_envios uuid[]) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  n integer;
begin
  if not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  update public.ofe_envios
     set status = 'aguardando', tentativas = 0, proxima_tentativa_em = null, motivo = null, erro_detalhe = null,
         despacho_iniciado_em = null, agendado_para = least(agendado_para, now()),
         preparado_em = case when motivo in ('sem_link_afiliado', 'variaveis_ausentes', 'dados_desatualizados', 'plataforma_bloqueada') then null else preparado_em end
   where id = any (p_envios) and status in ('falhou', 'incerto');
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.ofe_reenviar(uuid[]) from public, anon;
grant execute on function public.ofe_reenviar(uuid[]) to authenticated;

create or replace function public.ofe_descartar_envios(p_envios uuid[]) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  n integer;
begin
  if not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  update public.ofe_envios set status = 'cancelado', motivo = 'descartado'
   where id = any (p_envios) and status in ('falhou', 'incerto', 'aguardando');
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.ofe_descartar_envios(uuid[]) from public, anon;
grant execute on function public.ofe_descartar_envios(uuid[]) to authenticated;

grant select on public.ofe_filas, public.ofe_filas_destinos, public.ofe_filas_itens to ofe_worker;
grant select, insert, update on public.ofe_envios_tentativas to ofe_worker;
create policy ofe_filas_worker on public.ofe_filas for select to ofe_worker using (true);
create policy ofe_filas_destinos_worker on public.ofe_filas_destinos for select to ofe_worker using (true);
create policy ofe_filas_itens_worker on public.ofe_filas_itens for select to ofe_worker using (true);
create policy ofe_tentativas_worker on public.ofe_envios_tentativas for all to ofe_worker using (true) with check (true);
grant update (status) on public.ofe_filas to ofe_worker;

-- Alertas: envios com falha e incertos por fila (e avulsos).
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
     and not exists (select 1 from public.ofe_worker_estado w where w.ultimo_batimento_em > now() - interval '5 minutes')
  union all
  select case when bool_or(e.status = 'incerto') then 'ofe_envio_incerto' else 'ofe_envio_falhou' end,
         case when bool_or(e.status = 'incerto') then 'atencao' else 'info' end,
         count(*) || ' envio(s) com falha ou incerto(s)' || coalesce(' na fila ' || max(f.nome), ''),
         'Abra a aba Falhas e incertos para tentar de novo ou descartar. Incerto: confira no grupo antes.',
         case when p.fila_id is null then 'ofe_publicacao' else 'ofe_fila' end, p.fila_id
    from public.ofe_envios e join public.ofe_publicacoes p on p.id = e.publicacao_id
    left join public.ofe_filas f on f.id = p.fila_id
   where e.status in ('falhou', 'incerto') and e.atualizado_em > now() - interval '7 days'
   group by p.fila_id;
$$;
revoke execute on function app.ofe_alertas_devidos() from public, anon, authenticated;

-- Rotina diária (3h de São Paulo): expira cupons vencidos, apaga tentativas com mais de 180 dias.
create or replace function public.ofe_rotina_diaria() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is not null and not app.eh_dono() then raise exception 'sem_permissao'; end if;
  update public.ofe_cupons set status = 'expirado' where status = 'ativo' and fim_em is not null and fim_em <= now();
  delete from public.ofe_envios_tentativas where iniciado_em < now() - interval '180 days';
end $$;
revoke execute on function public.ofe_rotina_diaria() from public, anon;
grant execute on function public.ofe_rotina_diaria() to authenticated, service_role;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'ofe-filas';
  perform cron.schedule('ofe-filas', '*/5 * * * *', 'select public.ofe_avancar_filas()');
  perform cron.unschedule(jobid) from cron.job where jobname = 'ofe-rotina-diaria';
  perform cron.schedule('ofe-rotina-diaria', '0 6 * * *', 'select public.ofe_rotina_diaria()');
exception when others then
  raise notice 'agendamento nao criado: %', sqlerrm;
end $$;
