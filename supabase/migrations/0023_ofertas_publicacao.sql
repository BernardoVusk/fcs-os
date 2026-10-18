-- 0023: Grupos de Ofertas, operação manual. Grupos (cadastro manual; o worker sincroniza na 0024),
-- cupons manuais, ofertas, links de afiliado por grupo, publicações e envios (um por grupo).
-- Status da publicação é derivado dos envios (visão), nunca gravado. Modo manual: o usuário
-- publica e marca; modo automático chega com o worker (0024 e 0025).

create table public.ofe_grupos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 120),
  funcao text not null default 'destino' check (funcao in ('origem', 'destino', 'monitorado', 'teste', 'nenhuma')),
  cadastro text not null default 'manual' check (cadastro in ('manual', 'sincronizado')),
  jid text check (jid ~ '^[0-9-]+@g\.us$'),
  link_convite text check (link_convite ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]{10,40}$'),
  -- ID de rastreamento da Amazon só deste grupo (opcional); sem ele vale a tag da integração.
  tag_amazon text check (tag_amazon ~ '^[a-z0-9][a-z0-9-]{1,40}-2\d$'),
  campanha text check (char_length(campanha) <= 60),
  -- Grupo de origem só com autorização registrada (quem, quando, como).
  autorizado_em timestamptz,
  autorizado_por uuid references public.usuarios_app (id),
  autorizacao_descricao text check (char_length(autorizacao_descricao) <= 500),
  ativo boolean not null default true,
  observacoes text check (char_length(observacoes) <= 1000),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (funcao <> 'origem' or autorizado_em is not null)
);
create unique index ofe_grupos_jid on public.ofe_grupos (jid) where jid is not null;
create index ofe_grupos_funcao on public.ofe_grupos (funcao, ativo);
create trigger ofe_grupos_atualizado before update on public.ofe_grupos
  for each row execute function app.carimbar_atualizacao();
create trigger ofe_grupos_auditoria after insert or update or delete on public.ofe_grupos
  for each row execute function app.auditar();
alter table public.ofe_grupos enable row level security;
create policy ofe_grupos_ler on public.ofe_grupos for select to authenticated using (app.usuario_ativo());
create policy ofe_grupos_escrever on public.ofe_grupos for all to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());

create table public.ofe_cupons (
  id uuid primary key default gen_random_uuid(),
  plataforma text not null check (plataforma in ('shopee', 'mercado_livre', 'amazon', 'awin')),
  codigo text check (char_length(codigo) between 1 and 60),
  descricao text not null check (char_length(descricao) between 1 and 300),
  beneficio text check (char_length(beneficio) <= 200),
  regras text check (char_length(regras) <= 2000),
  valor_minimo numeric(14, 2) check (valor_minimo >= 0),
  inicio_em timestamptz,
  fim_em timestamptz,
  validade_confirmada boolean not null default false,
  url_referencia text check (url_referencia ~ '^https://'),
  aplicabilidade text check (char_length(aplicabilidade) <= 500),
  anunciante_awin integer,
  status text not null default 'ativo' check (status in ('ativo', 'pausado', 'expirado', 'removido')),
  verificacao text not null default 'manual' check (verificacao in ('manual', 'fonte_oficial')),
  fonte text not null default 'manual' check (fonte in ('manual', 'csv', 'awin')),
  referencia_externa text check (char_length(referencia_externa) <= 80),
  verificado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (fim_em is null or inicio_em is null or fim_em > inicio_em)
);
create unique index ofe_cupons_codigo on public.ofe_cupons (plataforma, lower(codigo), fim_em) nulls not distinct
  where codigo is not null and status <> 'removido';
create unique index ofe_cupons_externo on public.ofe_cupons (fonte, referencia_externa) where referencia_externa is not null;
create index ofe_cupons_vigencia on public.ofe_cupons (status, fim_em);
create trigger ofe_cupons_atualizado before update on public.ofe_cupons
  for each row execute function app.carimbar_atualizacao();
create trigger ofe_cupons_auditoria after insert or update or delete on public.ofe_cupons
  for each row execute function app.auditar();
alter table public.ofe_cupons enable row level security;
create policy ofe_cupons_ler on public.ofe_cupons for select to authenticated using (app.usuario_ativo());
create policy ofe_cupons_escrever on public.ofe_cupons for all to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());

-- Vigente = ativo, já começou e não venceu. Sem data de fim a validade não está confirmada,
-- mas o cupom não é bloqueado: a mensagem e a tela avisam.
create or replace function app.ofe_cupom_vigente(p_cupom uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((
    select c.status = 'ativo' and (c.inicio_em is null or c.inicio_em <= now()) and (c.fim_em is null or c.fim_em > now())
      from public.ofe_cupons c where c.id = p_cupom), false);
$$;
revoke execute on function app.ofe_cupom_vigente(uuid) from public, anon;
grant execute on function app.ofe_cupom_vigente(uuid) to authenticated, service_role, ofe_worker;

create table public.ofe_ofertas (
  id uuid primary key default gen_random_uuid(),
  plataforma text not null check (plataforma in ('shopee', 'mercado_livre', 'amazon', 'awin')),
  url_original text not null check (url_original ~ '^https://' and char_length(url_original) <= 2000),
  url_produto text check (url_produto ~ '^https://' and char_length(url_produto) <= 2000),
  chave_produto text check (char_length(chave_produto) <= 300),
  anunciante_awin integer,
  titulo text check (char_length(titulo) <= 300),
  imagem_caminho text check (char_length(imagem_caminho) <= 300),
  imagem_url text check (imagem_url ~ '^https://' and char_length(imagem_url) <= 2000),
  preco_atual numeric(14, 2) check (preco_atual > 0),
  preco_anterior numeric(14, 2) check (preco_anterior > 0),
  desconto numeric(7, 6) check (desconto > 0 and desconto < 1),
  preco_pix numeric(14, 2) check (preco_pix > 0),
  parcelamento text check (char_length(parcelamento) <= 120),
  avaliacao numeric(2, 1) check (avaliacao between 0 and 5),
  avaliacoes_qtd integer check (avaliacoes_qtd >= 0),
  loja text check (char_length(loja) <= 120),
  preco_variavel boolean not null default false,
  fontes jsonb not null default '{}'::jsonb check (jsonb_typeof(fontes) = 'object'),
  dados_atualizados_em timestamptz,
  link_colado text check (link_colado ~ '^https://' and char_length(link_colado) <= 2000),
  cupom_id uuid references public.ofe_cupons (id) on delete set null,
  modelo_id uuid references public.ofe_modelos (id) on delete set null,
  cta text check (char_length(cta) <= 200),
  campanha text check (char_length(campanha) <= 60),
  status text not null default 'rascunho' check (status in ('rascunho', 'pronta', 'arquivada')),
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index ofe_ofertas_chave on public.ofe_ofertas (chave_produto, criado_em desc);
create index ofe_ofertas_status on public.ofe_ofertas (status, atualizado_em desc);
create trigger ofe_ofertas_atualizado before update on public.ofe_ofertas
  for each row execute function app.carimbar_atualizacao();
create trigger ofe_ofertas_auditoria after insert or update or delete on public.ofe_ofertas
  for each row execute function app.auditar();
alter table public.ofe_ofertas enable row level security;
create policy ofe_ofertas_ler on public.ofe_ofertas for select to authenticated using (app.usuario_ativo());
create policy ofe_ofertas_escrever on public.ofe_ofertas for all to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());

-- Link de afiliado da oferta: um geral (grupo nulo) e um por grupo quando a atribuição é por grupo.
create table public.ofe_links (
  id uuid primary key default gen_random_uuid(),
  oferta_id uuid not null references public.ofe_ofertas (id) on delete cascade,
  grupo_id uuid references public.ofe_grupos (id) on delete cascade,
  url text not null check (url ~ '^https://' and char_length(url) <= 2000),
  origem text not null check (origem in ('api', 'tag', 'colado')),
  gerado_em timestamptz not null default now()
);
create unique index ofe_links_unico on public.ofe_links (oferta_id, grupo_id) nulls not distinct;
alter table public.ofe_links enable row level security;
create policy ofe_links_ler on public.ofe_links for select to authenticated using (app.usuario_ativo());
create policy ofe_links_escrever on public.ofe_links for all to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());

create table public.ofe_publicacoes (
  id uuid primary key default gen_random_uuid(),
  oferta_id uuid references public.ofe_ofertas (id) on delete restrict,
  cupom_id uuid references public.ofe_cupons (id) on delete restrict,
  origem text not null default 'avulsa' check (origem in ('avulsa', 'fila', 'copiador')),
  modo text not null check (modo in ('manual', 'automatico')),
  agendado_para timestamptz not null default now(),
  texto_editado text check (char_length(texto_editado) <= 4000),
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now(),
  check (num_nonnulls(oferta_id, cupom_id) >= 1)
);
create index ofe_publicacoes_oferta on public.ofe_publicacoes (oferta_id, criado_em desc);
alter table public.ofe_publicacoes enable row level security;
create policy ofe_publicacoes_ler on public.ofe_publicacoes for select to authenticated using (app.usuario_ativo());

create table public.ofe_envios (
  id uuid primary key default gen_random_uuid(),
  publicacao_id uuid not null references public.ofe_publicacoes (id) on delete cascade,
  grupo_id uuid not null references public.ofe_grupos (id) on delete restrict,
  modo text not null check (modo in ('manual', 'automatico')),
  status text not null default 'aguardando' check (status in (
    'aguardando', 'processando', 'enviado', 'incerto', 'falhou', 'cancelado', 'ignorado')),
  agendado_para timestamptz not null,
  texto_final text check (char_length(texto_final) <= 4096),
  link_url text check (link_url ~ '^https://' and char_length(link_url) <= 2000),
  link_origem text check (link_origem in ('api', 'tag', 'colado')),
  preparado_em timestamptz,
  tentativas integer not null default 0 check (tentativas >= 0),
  proxima_tentativa_em timestamptz,
  reservado_por text check (char_length(reservado_por) <= 80),
  reservado_ate timestamptz,
  despacho_iniciado_em timestamptz,
  wa_mensagem_id text check (char_length(wa_mensagem_id) <= 120),
  enviado_em timestamptz,
  enviado_por uuid,
  motivo text check (char_length(motivo) <= 60),
  erro_detalhe text check (char_length(erro_detalhe) <= 500),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
-- Idempotência: um envio por publicação e grupo, qualquer que seja o número de tentativas.
create unique index ofe_envios_unico on public.ofe_envios (publicacao_id, grupo_id);
create index ofe_envios_fila on public.ofe_envios (status, agendado_para);
create index ofe_envios_grupo on public.ofe_envios (grupo_id, enviado_em desc);
create trigger ofe_envios_atualizado before update on public.ofe_envios
  for each row execute function app.carimbar_atualizacao();
alter table public.ofe_envios enable row level security;
create policy ofe_envios_ler on public.ofe_envios for select to authenticated using (app.usuario_ativo());

-- Status da publicação a partir dos envios. Programado = aguardando com horário futuro.
create view public.ofe_publicacoes_status with (security_invoker = true) as
select p.id, p.oferta_id, p.cupom_id, p.origem, p.modo, p.agendado_para, p.criado_em,
       count(e.id)::integer as total,
       count(*) filter (where e.status = 'enviado')::integer as enviados,
       count(*) filter (where e.status = 'aguardando')::integer as aguardando,
       count(*) filter (where e.status = 'processando')::integer as processando,
       count(*) filter (where e.status = 'falhou')::integer as falhas,
       count(*) filter (where e.status = 'incerto')::integer as incertos,
       count(*) filter (where e.status = 'cancelado')::integer as cancelados,
       count(*) filter (where e.status = 'ignorado')::integer as ignorados,
       case
         when count(e.id) = 0 then 'rascunho'
         when count(*) filter (where e.status = 'processando') > 0 then 'processando'
         when count(*) filter (where e.status = 'incerto') > 0 then 'incerto'
         when count(*) filter (where e.status = 'aguardando') > 0 then
           case when count(*) filter (where e.status = 'enviado') > 0 then 'parcial'
                when p.agendado_para > now() then 'programado' else 'aguardando' end
         when count(*) filter (where e.status = 'enviado') = count(e.id) then 'enviado'
         when count(*) filter (where e.status = 'enviado') > 0 then 'parcial'
         when count(*) filter (where e.status = 'falhou') > 0 then 'falhou'
         when count(*) filter (where e.status = 'cancelado') = count(e.id) then 'cancelado'
         else 'ignorado'
       end as status
  from public.ofe_publicacoes p
  left join public.ofe_envios e on e.publicacao_id = p.id
 group by p.id;

-- Cria a publicação e um envio por grupo numa só transação. O texto e o link de cada grupo vêm
-- prontos da aplicação (conversão por API não roda no banco). Recusa: plataforma com trava de
-- conformidade fechada, cupom fora da vigência, grupo que não é destino ou teste, envio sem link.
-- security definer porque publicações e envios não têm policy de escrita para a sessão: só esta
-- função cria, depois de checar o papel (regra da 0019).
create or replace function public.ofe_criar_publicacao(
  p_oferta uuid,
  p_cupom uuid,
  p_modo text,
  p_agendado_para timestamptz,
  p_envios jsonb,
  p_texto_editado text default null,
  p_origem text default 'avulsa'
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_plataforma text;
  v_id uuid;
  v_quando timestamptz := coalesce(p_agendado_para, now());
  e jsonb;
begin
  if not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  if p_modo not in ('manual', 'automatico') then raise exception 'modo_invalido'; end if;
  if p_oferta is null and p_cupom is null then raise exception 'oferta_obrigatoria'; end if;
  if jsonb_typeof(p_envios) <> 'array' or jsonb_array_length(p_envios) = 0 then raise exception 'grupo_obrigatorio'; end if;

  if p_oferta is not null then
    select plataforma into v_plataforma from public.ofe_ofertas where id = p_oferta and status <> 'arquivada';
    if v_plataforma is null then raise exception 'oferta_nao_encontrada'; end if;
  else
    select plataforma into v_plataforma from public.ofe_cupons where id = p_cupom;
  end if;
  if not exists (select 1 from public.ofe_integracoes where plataforma = v_plataforma and conformidade_em is not null) then
    raise exception 'plataforma_bloqueada';
  end if;
  if p_cupom is not null and not app.ofe_cupom_vigente(p_cupom) then raise exception 'cupom_fora_da_vigencia'; end if;

  insert into public.ofe_publicacoes (oferta_id, cupom_id, origem, modo, agendado_para, texto_editado)
  values (p_oferta, p_cupom, coalesce(p_origem, 'avulsa'), p_modo, v_quando, nullif(btrim(coalesce(p_texto_editado, '')), ''))
  returning id into v_id;

  for e in select * from jsonb_array_elements(p_envios) loop
    if not exists (select 1 from public.ofe_grupos g where g.id = (e->>'grupo_id')::uuid and g.ativo and g.funcao in ('destino', 'teste')) then
      raise exception 'grupo_invalido';
    end if;
    if p_modo = 'manual' and (coalesce(e->>'texto', '') = '' or (p_oferta is not null and coalesce(e->>'link_url', '') = '')) then
      raise exception 'envio_sem_link';
    end if;
    insert into public.ofe_envios (publicacao_id, grupo_id, modo, agendado_para, texto_final, link_url, link_origem, preparado_em)
    values (v_id, (e->>'grupo_id')::uuid, p_modo, v_quando, nullif(e->>'texto', ''), nullif(e->>'link_url', ''),
            nullif(e->>'link_origem', ''), case when coalesce(e->>'texto', '') <> '' then now() end);
  end loop;

  if p_oferta is not null then
    update public.ofe_ofertas set status = 'pronta' where id = p_oferta and status = 'rascunho';
  end if;
  return v_id;
end $$;
revoke execute on function public.ofe_criar_publicacao(uuid, uuid, text, timestamptz, jsonb, text, text) from public, anon;
grant execute on function public.ofe_criar_publicacao(uuid, uuid, text, timestamptz, jsonb, text, text) to authenticated;

-- Escrita nos envios só por estas funções (sem policy de update para a sessão).
create or replace function public.ofe_marcar_publicado(p_envio uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_cupom uuid;
begin
  if not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  select p.cupom_id into v_cupom from public.ofe_envios e join public.ofe_publicacoes p on p.id = e.publicacao_id
   where e.id = p_envio and e.modo = 'manual' and e.status = 'aguardando';
  if not found then raise exception 'envio_nao_disponivel'; end if;
  if v_cupom is not null and not app.ofe_cupom_vigente(v_cupom) then raise exception 'cupom_fora_da_vigencia'; end if;
  update public.ofe_envios set status = 'enviado', enviado_em = now(), enviado_por = auth.uid(), motivo = null
   where id = p_envio and modo = 'manual' and status = 'aguardando';
  if not found then raise exception 'envio_nao_disponivel'; end if;
end $$;
revoke execute on function public.ofe_marcar_publicado(uuid) from public, anon;
grant execute on function public.ofe_marcar_publicado(uuid) to authenticated;

create or replace function public.ofe_pular_envio(p_envio uuid, p_motivo text default 'pulado') returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  update public.ofe_envios set status = 'ignorado', motivo = left(coalesce(p_motivo, 'pulado'), 60)
   where id = p_envio and status = 'aguardando';
  if not found then raise exception 'envio_nao_disponivel'; end if;
end $$;
revoke execute on function public.ofe_pular_envio(uuid, text) from public, anon;
grant execute on function public.ofe_pular_envio(uuid, text) to authenticated;

create or replace function public.ofe_cancelar_publicacao(p_publicacao uuid) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  n integer;
begin
  if not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  update public.ofe_envios set status = 'cancelado', motivo = 'cancelado_pelo_usuario'
   where publicacao_id = p_publicacao and status = 'aguardando';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.ofe_cancelar_publicacao(uuid) from public, anon;
grant execute on function public.ofe_cancelar_publicacao(uuid) to authenticated;

-- Bucket privado das imagens de oferta enviadas pelo usuário (até 5 MB, só imagem).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ofertas-imagens', 'ofertas-imagens', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
create policy ofertas_imagens_ler on storage.objects for select to authenticated
  using (bucket_id = 'ofertas-imagens' and app.usuario_ativo());
create policy ofertas_imagens_inserir on storage.objects for insert to authenticated
  with check (bucket_id = 'ofertas-imagens' and app.pode_escrever());
create policy ofertas_imagens_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'ofertas-imagens' and app.pode_escrever());

-- Worker: lê o que precisa para preparar e enviar; escreve só nos envios e links.
grant select on public.ofe_grupos, public.ofe_cupons, public.ofe_ofertas, public.ofe_publicacoes to ofe_worker;
grant select, insert, update on public.ofe_links to ofe_worker;
grant select, update on public.ofe_envios to ofe_worker;
grant update (titulo, imagem_url, preco_atual, desconto, avaliacao, loja, preco_variavel, fontes, dados_atualizados_em)
  on public.ofe_ofertas to ofe_worker;
grant update (status) on public.ofe_cupons to ofe_worker;
create policy ofe_grupos_worker on public.ofe_grupos for all to ofe_worker using (true) with check (true);
create policy ofe_cupons_worker on public.ofe_cupons for all to ofe_worker using (true) with check (true);
create policy ofe_ofertas_worker on public.ofe_ofertas for all to ofe_worker using (true) with check (true);
create policy ofe_publicacoes_worker on public.ofe_publicacoes for select to ofe_worker using (true);
create policy ofe_links_worker on public.ofe_links for all to ofe_worker using (true) with check (true);
create policy ofe_envios_worker on public.ofe_envios for all to ofe_worker using (true) with check (true);

-- Alertas: publicação manual com mais de 2 horas de atraso.
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
  having count(*) > 0;
$$;
revoke execute on function app.ofe_alertas_devidos() from public, anon, authenticated;
