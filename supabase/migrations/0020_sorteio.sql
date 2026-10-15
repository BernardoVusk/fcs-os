-- 0020: sorteio do panfleto (QR). A página pública /sorteio grava em clientes e em
-- inscricoes_sorteio por uma função que só a service role executa; o sorteio mensal é
-- função chamada pelo dono pela tela Vendas > Sorteio.

-- Dígitos do telefone sem o 55 do país, para comparar e indexar.
create or replace function app.telefone_digitos(p text) returns text
language sql immutable strict as $$
  select case when length(d) in (12, 13) and left(d, 2) = '55' then substr(d, 3) else d end
  from (select regexp_replace(p, '\D', '', 'g') as d) s;
$$;
revoke execute on function app.telefone_digitos(text) from public, anon;
grant execute on function app.telefone_digitos(text) to authenticated, service_role;

create index clientes_email_lower on public.clientes (lower(email)) where email is not null;
create index clientes_telefone_digitos on public.clientes (app.telefone_digitos(telefone))
  where telefone is not null;

create table public.inscricoes_sorteio (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  produto_id uuid references public.produtos (id),
  produto_outro text check (char_length(produto_outro) <= 120),
  canal_id uuid not null references public.canais_venda (id),
  aceita_contato boolean not null default false,
  origem text not null default 'panfleto' check (origem in ('panfleto', 'instagram', 'outro')),
  ip_hash text check (char_length(ip_hash) <= 64),
  user_agent text check (char_length(user_agent) <= 300),
  referencia text not null default to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM')
    check (referencia ~ '^\d{4}-\d{2}$'),
  criado_em timestamptz not null default now(),
  check (produto_id is not null or produto_outro is not null)
);
create index inscricoes_sorteio_referencia on public.inscricoes_sorteio (referencia, criado_em desc);
create index inscricoes_sorteio_cliente on public.inscricoes_sorteio (cliente_id, criado_em desc);
create index inscricoes_sorteio_ip on public.inscricoes_sorteio (ip_hash, criado_em desc)
  where ip_hash is not null;
create trigger inscricoes_sorteio_auditoria
  after insert or update or delete on public.inscricoes_sorteio
  for each row execute function app.auditar();
alter table public.inscricoes_sorteio enable row level security;
create policy inscricoes_sorteio_ler on public.inscricoes_sorteio
  for select to authenticated using (app.usuario_ativo());
-- Sem policy de escrita: só a service role grava, por inscrever_sorteio.

create table public.sorteios (
  id uuid primary key default gen_random_uuid(),
  referencia text not null unique check (referencia ~ '^\d{4}-\d{2}$'),
  inscricao_id uuid not null references public.inscricoes_sorteio (id),
  sorteado_em timestamptz not null default now(),
  sorteado_por uuid default app.usuario_da_requisicao()
);
create trigger sorteios_auditoria
  after insert or update or delete on public.sorteios
  for each row execute function app.auditar();
alter table public.sorteios enable row level security;
create policy sorteios_ler on public.sorteios for select to authenticated using (app.usuario_ativo());
create policy sorteios_inserir on public.sorteios for insert to authenticated with check (app.eh_dono());

-- Meses com inscrições, para o filtro da tela.
create view public.inscricoes_sorteio_meses with (security_invoker = true) as
select referencia, count(*)::integer as total
from public.inscricoes_sorteio
group by referencia;

-- Inscrição vinda da página pública. Cria ou reaproveita o cliente (e-mail, depois telefone),
-- grava a inscrição e devolve ids. Executável só pela service role (a action do servidor).
create or replace function public.inscrever_sorteio(
  p_nome text,
  p_email text,
  p_telefone text,
  p_canal text,
  p_aceita_contato boolean,
  p_produto uuid default null,
  p_produto_outro text default null,
  p_origem text default 'panfleto',
  p_ip_hash text default null,
  p_user_agent text default null
) returns jsonb
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_canal uuid;
  v_cliente uuid;
  v_inscricao uuid;
  v_novo boolean := false;
  v_origem text;
  v_outro text;
  v_nota text;
begin
  if p_nome is null or char_length(btrim(p_nome)) = 0 then raise exception 'nome_obrigatorio'; end if;
  if char_length(btrim(p_nome)) > 160 then raise exception 'nome_longo'; end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(p_email) > 160 then
    raise exception 'email_invalido';
  end if;
  if p_telefone is null or p_telefone !~ '^\d{10,11}$' then raise exception 'telefone_invalido'; end if;
  if not coalesce(p_aceita_contato, false) then raise exception 'consentimento_obrigatorio'; end if;

  select id into v_canal from public.canais_venda
   where tipo = p_canal and ativo order by criado_em limit 1;
  if v_canal is null then raise exception 'canal_obrigatorio'; end if;

  v_outro := nullif(btrim(coalesce(p_produto_outro, '')), '');
  if p_produto is not null then
    if not exists (select 1 from public.produtos where id = p_produto and status = 'ativo') then
      raise exception 'produto_obrigatorio';
    end if;
    v_outro := null;
  elsif v_outro is null then
    raise exception 'produto_obrigatorio';
  end if;

  v_origem := case when p_origem in ('panfleto', 'instagram', 'outro') then p_origem else 'outro' end;

  -- Limite firme, independente da instância do servidor: 20 inscrições por IP por hora.
  if p_ip_hash is not null and (
       select count(*) from public.inscricoes_sorteio
        where ip_hash = p_ip_hash and criado_em > now() - interval '1 hour'
     ) >= 20 then
    raise exception 'muitas_tentativas';
  end if;

  select id into v_cliente from public.clientes
   where not anonimizado and lower(email) = lower(p_email)
   order by criado_em limit 1;
  if v_cliente is null then
    select id into v_cliente from public.clientes
     where not anonimizado and app.telefone_digitos(telefone) = p_telefone
     order by criado_em limit 1;
  end if;

  if v_cliente is not null then
    select id into v_inscricao from public.inscricoes_sorteio
     where cliente_id = v_cliente
       and criado_em > now() - interval '24 hours'
       and produto_id is not distinct from p_produto
       and (p_produto is not null or lower(produto_outro) is not distinct from lower(v_outro))
     order by criado_em desc limit 1;
    if v_inscricao is not null then
      return jsonb_build_object(
        'cliente_id', v_cliente, 'inscricao_id', v_inscricao,
        'repetida', true, 'cliente_novo', false
      );
    end if;
  end if;

  v_nota := 'Cadastro pelo sorteio (QR do panfleto) em '
    || to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY');

  if v_cliente is null then
    insert into public.clientes (nome, email, telefone, canal_origem_id, observacoes)
    values (btrim(p_nome), lower(p_email), p_telefone, v_canal, v_nota)
    returning id into v_cliente;
    v_novo := true;
  else
    update public.clientes
       set email = coalesce(email, lower(p_email)),
           telefone = coalesce(telefone, p_telefone),
           observacoes = concat_ws(E'\n', observacoes, v_nota)
     where id = v_cliente;
  end if;

  insert into public.inscricoes_sorteio
    (cliente_id, produto_id, produto_outro, canal_id, aceita_contato, origem, ip_hash, user_agent)
  values
    (v_cliente, p_produto, v_outro, v_canal, true, v_origem, p_ip_hash, left(p_user_agent, 300))
  returning id into v_inscricao;

  return jsonb_build_object(
    'cliente_id', v_cliente, 'inscricao_id', v_inscricao,
    'repetida', false, 'cliente_novo', v_novo
  );
end $$;
revoke execute on function public.inscrever_sorteio(text, text, text, text, boolean, uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.inscrever_sorteio(text, text, text, text, boolean, uuid, text, text, text, text)
  to service_role;

-- Sorteio do mês: um ganhador aleatório entre as inscrições do mês de quem aceitou contato.
-- Só o dono. O unique em sorteios.referencia protege contra clique duplo.
create or replace function public.realizar_sorteio(p_referencia text) returns jsonb
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_inscricao uuid;
  v_id uuid;
  r record;
begin
  if not app.eh_dono() then raise exception 'sem_permissao'; end if;
  if p_referencia is null or p_referencia !~ '^\d{4}-\d{2}$' then raise exception 'data_invalida'; end if;
  if exists (select 1 from public.sorteios where referencia = p_referencia) then
    raise exception 'sorteio_ja_realizado';
  end if;

  select i.id into v_inscricao
    from public.inscricoes_sorteio i
    join public.clientes c on c.id = i.cliente_id
   where i.referencia = p_referencia and i.aceita_contato and not c.anonimizado
   order by random() limit 1;
  if v_inscricao is null then raise exception 'sem_inscricoes'; end if;

  insert into public.sorteios (referencia, inscricao_id)
  values (p_referencia, v_inscricao) returning id into v_id;

  select s.id, s.referencia, s.sorteado_em, i.id as inscricao_id,
         c.id as cliente_id, c.nome, c.email, c.telefone,
         coalesce(p.nome, i.produto_outro) as produto
    into r
    from public.sorteios s
    join public.inscricoes_sorteio i on i.id = s.inscricao_id
    join public.clientes c on c.id = i.cliente_id
    left join public.produtos p on p.id = i.produto_id
   where s.id = v_id;
  return to_jsonb(r);
end $$;
revoke execute on function public.realizar_sorteio(text) from public, anon;
grant execute on function public.realizar_sorteio(text) to authenticated, service_role;
