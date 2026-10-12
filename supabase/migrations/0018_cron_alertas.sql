-- Fase 9: agenda a geração de alertas todo dia às 9h de São Paulo (12h UTC).
-- Isolado da 0017 para que, se o pg_cron não estiver disponível, só o agendamento fique de fora
-- (a tela Alertas tem o botão "Verificar agora" e a função continua chamável por rpc).
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron indisponivel: %', sqlerrm;
end $$;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'alertas-diarios';
  perform cron.schedule('alertas-diarios', '0 12 * * *', 'select public.gerar_alertas()');
exception when others then
  raise notice 'agendamento nao criado: %', sqlerrm;
end $$;
