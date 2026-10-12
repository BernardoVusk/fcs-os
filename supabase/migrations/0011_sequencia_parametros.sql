-- 0011: a sequência de versões dos parâmetros fica no schema app e precisava de grant para a API.
grant usage, select on sequence app.parametros_custo_versao to authenticated, service_role;
