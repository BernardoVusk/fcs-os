-- 0027: Grupos de Ofertas, cupons automáticos. Cupons da Awin (Promotions API, fonte oficial)
-- entram por registro idempotente; cupom novo só é disparado sozinho se a regra estiver ligada e
-- apontar uma fila (que cuida de grupos, cadência e modelo). Shopee, Mercado Livre e Amazon não
-- têm API de cupons para afiliados: continuam manuais ou por importação.

create table public.ofe_cupons_regras (
  id boolean primary key default true check (id),
  enviar_awin boolean not null default false,
  fila_awin_id uuid references public.ofe_filas (id) on delete set null,
  sincronizado_em timestamptz,
  atualizado_em timestamptz not null default now()
);
insert into public.ofe_cupons_regras (id) values (true);
create trigger ofe_cupons_regras_atualizado before update on public.ofe_cupons_regras
  for each row execute function app.carimbar_atualizacao();
create trigger ofe_cupons_regras_auditoria after insert or update or delete on public.ofe_cupons_regras
  for each row execute function app.auditar('id');
alter table public.ofe_cupons_regras enable row level security;
create policy ofe_cupons_regras_ler on public.ofe_cupons_regras for select to authenticated using (app.usuario_ativo());
create policy ofe_cupons_regras_alterar on public.ofe_cupons_regras for update to authenticated
  using (app.pode_escrever()) with check (app.pode_escrever());
grant select on public.ofe_cupons_regras to ofe_worker;
create policy ofe_cupons_regras_worker on public.ofe_cupons_regras for select to ofe_worker using (true);

-- Registra cupons da Awin: novo entra ativo; existente atualiza datas, termos e código. Devolve
-- quantos são novos. Cupom novo vai para a fila da regra quando o envio automático está ligado.
create or replace function public.ofe_registrar_cupons_awin(p_cupons jsonb) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  c jsonb;
  v_id uuid;
  v_novo boolean;
  r record;
  n integer := 0;
begin
  if auth.uid() is not null and not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  select * into r from public.ofe_cupons_regras where id;
  for c in select * from jsonb_array_elements(coalesce(p_cupons, '[]'::jsonb)) loop
    if coalesce(c->>'referencia', '') = '' then continue; end if;
    select id into v_id from public.ofe_cupons where fonte = 'awin' and referencia_externa = c->>'referencia';
    v_novo := v_id is null;
    if v_novo then
      insert into public.ofe_cupons (plataforma, codigo, descricao, beneficio, regras, inicio_em, fim_em, validade_confirmada,
                                     url_referencia, anunciante_awin, status, verificacao, fonte, referencia_externa, verificado_em)
      values ('awin', nullif(c->>'codigo', ''), left(coalesce(nullif(c->>'titulo', ''), 'Cupom Awin'), 300), left(nullif(c->>'anunciante', ''), 200),
              left(nullif(c->>'termos', ''), 2000), (c->>'inicio')::timestamptz, (c->>'fim')::timestamptz, (c->>'fim') is not null,
              nullif(c->>'url', ''), (c->>'advertiser_id')::integer, 'ativo', 'fonte_oficial', 'awin', c->>'referencia', now())
      returning id into v_id;
      n := n + 1;
      if r.enviar_awin and r.fila_awin_id is not null and nullif(c->>'codigo', '') is not null then
        insert into public.ofe_filas_itens (fila_id, cupom_id, posicao)
        values (r.fila_awin_id, v_id, coalesce((select max(posicao) from public.ofe_filas_itens where fila_id = r.fila_awin_id), 0) + 1);
      end if;
    else
      update public.ofe_cupons
         set codigo = coalesce(nullif(c->>'codigo', ''), codigo), regras = coalesce(left(nullif(c->>'termos', ''), 2000), regras),
             inicio_em = coalesce((c->>'inicio')::timestamptz, inicio_em), fim_em = coalesce((c->>'fim')::timestamptz, fim_em),
             validade_confirmada = (coalesce(c->>'fim', '') <> '') or validade_confirmada,
             url_referencia = coalesce(nullif(c->>'url', ''), url_referencia), verificado_em = now()
       where id = v_id and status <> 'removido';
    end if;
  end loop;
  update public.ofe_cupons_regras set sincronizado_em = now() where id;
  return n;
end $$;
revoke execute on function public.ofe_registrar_cupons_awin(jsonb) from public, anon;
grant execute on function public.ofe_registrar_cupons_awin(jsonb) to authenticated, ofe_worker;

-- Alertas: cupons que vencem nas próximas 48 horas (um alerta agregado).
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
   group by p.fila_id
  union all
  select 'ofe_cupom_vencendo', 'info', count(*) || ' cupom(ns) vencem nas próximas 48 horas',
         'Confira em Grupos de Ofertas > Cupons. Cupom vencido não sai em nenhuma mensagem.', 'ofe_cupom', null::uuid
    from public.ofe_cupons c
   where c.status = 'ativo' and c.fim_em > now() and c.fim_em <= now() + interval '48 hours'
  having count(*) > 0;
$$;
revoke execute on function app.ofe_alertas_devidos() from public, anon, authenticated;
