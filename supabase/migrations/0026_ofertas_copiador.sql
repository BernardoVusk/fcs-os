-- 0026: Grupos de Ofertas, copiador. Automação lê um grupo de origem autorizado, filtra, limpa o
-- texto e publica nos destinos com o nosso link de afiliado (gerado por grupo na preparação).
-- Texto de terceiro só para quem escreve e apagado em 30 dias (ficam hash, link e decisão).

create table public.ofe_automacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 80),
  grupo_origem_id uuid not null references public.ofe_grupos (id) on delete restrict,
  numero_id uuid references public.ofe_numeros (id) on delete set null,
  plataformas text[] not null default array['shopee', 'mercado_livre', 'amazon', 'awin']
    check (plataformas <@ array['shopee', 'mercado_livre', 'amazon', 'awin']),
  filtros jsonb not null default '{}'::jsonb check (jsonb_typeof(filtros) = 'object'),
  limpeza jsonb not null default '{}'::jsonb check (jsonb_typeof(limpeza) = 'object'),
  revisao_manual boolean not null default true,
  janela_duplicidade_horas integer not null default 24 check (janela_duplicidade_horas between 1 and 720),
  intervalo_segundos integer not null default 300 check (intervalo_segundos between 30 and 86400),
  status text not null default 'rascunho' check (status in ('rascunho', 'ativa', 'pausada', 'encerrada', 'erro')),
  ultimo_erro text check (char_length(ultimo_erro) <= 300),
  criado_por uuid default app.usuario_da_requisicao(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger ofe_automacoes_atualizado before update on public.ofe_automacoes
  for each row execute function app.carimbar_atualizacao();
create trigger ofe_automacoes_auditoria after insert or update or delete on public.ofe_automacoes
  for each row execute function app.auditar();
alter table public.ofe_automacoes enable row level security;
create policy ofe_automacoes_ler on public.ofe_automacoes for select to authenticated using (app.usuario_ativo());
create policy ofe_automacoes_escrever on public.ofe_automacoes for all to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());

-- Só grupo marcado como origem (com autorização) pode ser lido por uma automação.
create or replace function app.ofe_checar_origem() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.ofe_grupos where id = new.grupo_origem_id and funcao = 'origem' and autorizado_em is not null) then
    raise exception 'origem_nao_autorizada';
  end if;
  return new;
end $$;
create trigger ofe_automacoes_origem before insert or update of grupo_origem_id on public.ofe_automacoes
  for each row execute function app.ofe_checar_origem();

create table public.ofe_automacoes_destinos (
  automacao_id uuid not null references public.ofe_automacoes (id) on delete cascade,
  grupo_id uuid not null references public.ofe_grupos (id) on delete cascade,
  primary key (automacao_id, grupo_id)
);
alter table public.ofe_automacoes_destinos enable row level security;
create policy ofe_auto_destinos_ler on public.ofe_automacoes_destinos for select to authenticated using (app.usuario_ativo());
create policy ofe_auto_destinos_escrever on public.ofe_automacoes_destinos for all to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());

create table public.ofe_mensagens_origem (
  id uuid primary key default gen_random_uuid(),
  automacao_id uuid not null references public.ofe_automacoes (id) on delete cascade,
  grupo_id uuid not null references public.ofe_grupos (id) on delete cascade,
  wa_mensagem_id text not null check (char_length(wa_mensagem_id) between 1 and 120),
  recebida_em timestamptz not null default now(),
  texto text check (char_length(texto) <= 4096),
  texto_processado text check (char_length(texto_processado) <= 4096),
  hash_conteudo text check (char_length(hash_conteudo) <= 80),
  chave_produto text check (char_length(chave_produto) <= 300),
  plataforma text check (plataforma in ('shopee', 'mercado_livre', 'amazon', 'awin')),
  link_original text check (char_length(link_original) <= 2000),
  titulo_sugerido text check (char_length(titulo_sugerido) <= 300),
  removidos text[] not null default '{}',
  status text not null default 'recebida' check (status in (
    'previa', 'recebida', 'ignorada', 'aguardando_revisao', 'publicada', 'descartada', 'falhou')),
  motivo text check (char_length(motivo) <= 60),
  oferta_id uuid references public.ofe_ofertas (id) on delete set null,
  publicacao_id uuid references public.ofe_publicacoes (id) on delete set null,
  revisado_por uuid,
  revisado_em timestamptz
);
create unique index ofe_mensagens_origem_unica on public.ofe_mensagens_origem (automacao_id, grupo_id, wa_mensagem_id);
create index ofe_mensagens_origem_auto on public.ofe_mensagens_origem (automacao_id, recebida_em desc);
create index ofe_mensagens_origem_chave on public.ofe_mensagens_origem (automacao_id, chave_produto, recebida_em desc);
alter table public.ofe_mensagens_origem enable row level security;
create policy ofe_mensagens_origem_ler on public.ofe_mensagens_origem for select to authenticated using (app.pode_escrever());

-- Publica uma mensagem processada: cria a oferta (link da origem como URL do produto), a publicação
-- e um envio por destino. O texto vai como texto da postagem, com {{link}} no lugar do link; o link
-- de cada grupo sai na preparação. Duplicidade e intervalo sob trava por automação.
create or replace function public.ofe_enfileirar_mensagem(p_mensagem uuid, p_texto text default null, p_link_colado text default null)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  m record;
  a record;
  v_oferta uuid;
  v_pub uuid;
  v_ultima timestamptz;
  v_quando timestamptz := now();
  v_texto text;
begin
  if auth.uid() is not null and not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  select * into m from public.ofe_mensagens_origem where id = p_mensagem for update;
  if not found then raise exception 'nao_encontrado'; end if;
  if m.status not in ('recebida', 'aguardando_revisao') then return m.status; end if;
  select * into a from public.ofe_automacoes where id = m.automacao_id;
  if a.status <> 'ativa' then
    update public.ofe_mensagens_origem set status = 'ignorada', motivo = 'automacao_inativa' where id = p_mensagem;
    return 'ignorada';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(a.id::text, 0));

  if m.plataforma is null or not exists (select 1 from public.ofe_integracoes where plataforma = m.plataforma and conformidade_em is not null) then
    update public.ofe_mensagens_origem set status = 'falhou', motivo = 'plataforma_bloqueada' where id = p_mensagem;
    return 'falhou';
  end if;
  if exists (
    select 1 from public.ofe_mensagens_origem x
     where x.automacao_id = a.id and x.id <> m.id and x.status = 'publicada'
       and ((m.chave_produto is not null and x.chave_produto = m.chave_produto) or (m.chave_produto is null and x.hash_conteudo = m.hash_conteudo))
       and x.recebida_em > now() - make_interval(hours => a.janela_duplicidade_horas)
  ) then
    update public.ofe_mensagens_origem set status = 'ignorada', motivo = 'duplicado' where id = p_mensagem;
    return 'ignorada';
  end if;
  if not exists (select 1 from public.ofe_automacoes_destinos d join public.ofe_grupos g on g.id = d.grupo_id
                  where d.automacao_id = a.id and g.ativo and g.funcao in ('destino', 'teste')) then
    update public.ofe_mensagens_origem set status = 'falhou', motivo = 'sem_destino' where id = p_mensagem;
    return 'falhou';
  end if;

  v_texto := coalesce(nullif(btrim(coalesce(p_texto, '')), ''), m.texto_processado);
  if v_texto is null then raise exception 'envio_sem_texto'; end if;
  if position('{{link}}' in v_texto) = 0 then v_texto := v_texto || E'\n\n{{link}}'; end if;

  insert into public.ofe_ofertas (plataforma, url_original, chave_produto, titulo, link_colado, status, criado_por)
  values (m.plataforma, m.link_original, m.chave_produto, coalesce(m.titulo_sugerido, 'Oferta copiada'),
          nullif(btrim(coalesce(p_link_colado, '')), ''), 'pronta', a.criado_por)
  returning id into v_oferta;

  select max(p.agendado_para) into v_ultima from public.ofe_publicacoes p
    join public.ofe_mensagens_origem x on x.publicacao_id = p.id where x.automacao_id = a.id;
  if v_ultima is not null and v_ultima + make_interval(secs => a.intervalo_segundos) > now() then
    v_quando := v_ultima + make_interval(secs => a.intervalo_segundos);
  end if;

  insert into public.ofe_publicacoes (oferta_id, origem, modo, numero_id, agendado_para, texto_editado, criado_por)
  values (v_oferta, 'copiador', case when a.numero_id is null then 'manual' else 'automatico' end, a.numero_id, v_quando, left(v_texto, 4000), a.criado_por)
  returning id into v_pub;
  insert into public.ofe_envios (publicacao_id, grupo_id, modo, numero_id, agendado_para)
  select v_pub, d.grupo_id, case when a.numero_id is null then 'manual' else 'automatico' end, a.numero_id, v_quando
    from public.ofe_automacoes_destinos d join public.ofe_grupos g on g.id = d.grupo_id
   where d.automacao_id = a.id and g.ativo and g.funcao in ('destino', 'teste');

  update public.ofe_mensagens_origem
     set status = 'publicada', motivo = null, oferta_id = v_oferta, publicacao_id = v_pub, texto_processado = left(v_texto, 4096),
         revisado_por = coalesce(auth.uid(), revisado_por), revisado_em = case when auth.uid() is not null then now() else revisado_em end
   where id = p_mensagem;
  return 'publicada';
end $$;
revoke execute on function public.ofe_enfileirar_mensagem(uuid, text, text) from public, anon;
grant execute on function public.ofe_enfileirar_mensagem(uuid, text, text) to authenticated, ofe_worker;

create or replace function public.ofe_descartar_mensagem(p_mensagem uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  update public.ofe_mensagens_origem set status = 'descartada', revisado_por = auth.uid(), revisado_em = now()
   where id = p_mensagem and status in ('aguardando_revisao', 'previa', 'recebida');
end $$;
revoke execute on function public.ofe_descartar_mensagem(uuid) from public, anon;
grant execute on function public.ofe_descartar_mensagem(uuid) to authenticated;

grant select on public.ofe_automacoes, public.ofe_automacoes_destinos to ofe_worker;
grant select, insert, update on public.ofe_mensagens_origem to ofe_worker;
grant update (status, ultimo_erro) on public.ofe_automacoes to ofe_worker;
create policy ofe_automacoes_worker on public.ofe_automacoes for all to ofe_worker using (true) with check (true);
create policy ofe_auto_destinos_worker on public.ofe_automacoes_destinos for select to ofe_worker using (true);
create policy ofe_mensagens_origem_worker on public.ofe_mensagens_origem for all to ofe_worker using (true) with check (true);

-- Retenção: texto de terceiro some depois de 30 dias (decisão, hash e link ficam).
create or replace function public.ofe_rotina_diaria() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is not null and not app.eh_dono() then raise exception 'sem_permissao'; end if;
  update public.ofe_cupons set status = 'expirado' where status = 'ativo' and fim_em is not null and fim_em <= now();
  delete from public.ofe_envios_tentativas where iniciado_em < now() - interval '180 days';
  update public.ofe_mensagens_origem set texto = null, texto_processado = null
   where recebida_em < now() - interval '30 days' and (texto is not null or texto_processado is not null);
  delete from public.ofe_mensagens_origem where recebida_em < now() - interval '180 days' and status in ('previa', 'ignorada', 'descartada');
end $$;
revoke execute on function public.ofe_rotina_diaria() from public, anon;
grant execute on function public.ofe_rotina_diaria() to authenticated, service_role;
