-- Fase 10 (auditoria de segurança): função security definer exposta por rpc passa a exigir papel que escreve.
-- garantir_recebivel é chamada pelo gatilho de pedidos (sessão do operador ou do dono) e pelo serviço;
-- chamada direta por rpc de um usuário só leitura era possível e criava lançamento.
create or replace function public.garantir_recebivel(p_pedido uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  p record;
  v_valor numeric;
  v_dias integer;
  v_conta uuid;
  v_categoria uuid;
  v_id uuid;
  v_realizado numeric;
begin
  if auth.uid() is not null and not app.pode_escrever() then raise exception 'sem_permissao'; end if;
  select pe.*, cv.nome as canal_nome into p from public.pedidos pe join public.canais_venda cv on cv.id = pe.canal_id where pe.id = p_pedido;
  if not found then return null; end if;
  v_valor := (p.resumo->>'valor_a_receber')::numeric;
  if v_valor is null or v_valor <= 0 then return null; end if;
  select dias_repasse into v_dias from public.canais_venda_vigentes where id = p.canal_id;
  select id into v_conta from public.contas_financeiras where canal_id = p.canal_id and ativo order by criado_em limit 1;
  select id into v_categoria from public.categorias_financeiras where tipo = 'receita' and nome = 'Vendas';
  select id into v_id from public.lancamentos where origem_tipo = 'pedido' and origem_id = p_pedido and papel_origem = 'principal';
  if v_id is not null then
    select coalesce(sum(valor), 0) into v_realizado from public.lancamentos_realizacoes where lancamento_id = v_id;
    update public.lancamentos set valor_previsto = v_valor where id = v_id and v_realizado = 0 and cancelado_em is null and estornado_em is null and encerrado_em is null and valor_previsto <> v_valor;
    return v_id;
  end if;
  insert into public.lancamentos (tipo, descricao, categoria_id, conta_id, valor_previsto, competencia, data_prevista, origem_tipo, origem_id, papel_origem, observacoes)
  values ('receita', 'Pedido ' || p.codigo || ' (' || p.canal_nome || ')', v_categoria, v_conta, v_valor, date_trunc('month', p.data_pedido)::date,
          coalesce(p.data_pagamento, current_date) + coalesce(v_dias, 0), 'pedido', p_pedido, 'principal',
          case when v_dias is null then 'Canal sem dias de repasse configurados: data prevista igual ao pagamento.' else null end)
  returning id into v_id;
  return v_id;
end $$;
