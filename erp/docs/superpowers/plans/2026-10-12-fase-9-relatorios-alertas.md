# Fase 9 (Relatórios, alertas, auditoria e exportações): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relatórios de rentabilidade (produto, canal, pedido), custo real x estimado, desempenho de impressoras e consumo de filamento por mês, com período e exportação CSV e XLSX; central de alertas com resolução e silêncio e geração diária (pg_cron, com botão "Verificar agora"); tela de auditoria com filtros; comparação com o período anterior no painel inicial.

**Architecture:** Views SQL `security invoker` entregam linhas brutas (`rel_vendas_itens`, `rel_ordens_concluidas`, `rel_consumo_mensal`); as agregações (por produto, canal, pedido, impressora, mês; variação percentual) são puras em `src/dominio/relatorios/agregacoes.ts`. Exportação sem dependência: CSV com proteção contra fórmula (`csv.ts`) e XLSX gerado à mão (zip "stored" + XML com inline strings, `xlsx.ts`), ambos testados. Alertas: função `public.gerar_alertas()` (`security definer`) abre e resolve `prazo_vencido`, `ordem_atrasada`, `pedido_parado`, `lancamento_vencido` e `manutencao_prevista`; pg_cron agenda às 9h (migração separada, para falhar isolada); tela chama por rpc. Política de update em `alertas` para resolver e silenciar.

**Tech Stack:** o das fases anteriores. Nenhuma biblioteca nova.

Spec: seções 4 (Relatórios, Alertas, Auditoria), 10 (Fase 9) e critérios 11 e 13 da seção 14.

## Regras fixadas

- Relatórios usam só dados reais: pedido pago (data de pagamento no período), ordem concluída (fim real no período), consumo de produção (data da movimentação). Campo sem dado fica nulo e a tela mostra "Sem dados".
- Rentabilidade por produto soma os itens de pedidos pagos: receita = quantidade x preço menos desconto do item; custo estimado e realizado só quando o item tem; margem = resultado / receita. Por canal usa o `resumo` do pedido (base de vendas, taxas, receita líquida, custo, resultado). Por pedido lista o `resumo`.
- Custo real x estimado: por ordem concluída (custo estimado da ordem contra `custo_realizado.total`) e por produto (média por peça). Desvio = real menos estimado e em porcentagem do estimado.
- Impressoras: horas reais, horas previstas, peças aprovadas e perdidas, falha real = perdidas / (aprovadas + perdidas), ordens no período.
- Consumo de filamento por mês: gramas e valor de `consumo_producao` dos insumos tipo filamento, por insumo e total.
- Alerta é único por (tipo, entidade) enquanto aberto (índice já existe); gerar é idempotente e resolve o que deixou de valer. Silenciar guarda `silenciado_ate` e esconde da lista até lá.
- Exportação nunca injeta fórmula: célula começando com `=`, `+`, `-`, `@`, tab ou retorno recebe apóstrofo no CSV e vai como texto no XLSX; CSV com BOM e `;`.
- Auditoria só para o dono: filtros por tabela, ação, origem, período e id do registro; mostra as chaves que mudaram.

## Tarefas

1. Migração `0017_relatorios_alertas.sql`: views, `gerar_alertas()`, policy de update em alertas, índice de auditoria por usuário. Migração `0018_cron_alertas.sql`: `create extension pg_cron` e agendamento diário.
2. Domínio `dominio/relatorios/{agregacoes,csv,xlsx}.ts` com testes.
3. Dados `dados/relatorios/relatorios.ts`, `dados/alertas.ts` (abertos, silenciados, resolver), `dados/auditoria.ts`; ações `acoes/alertas.ts` (resolver, silenciar, gerar agora).
4. Telas: `/relatorios` (abas por relatório, período, exportar), rota `/relatorios/exportar`, `/alertas`, `/configuracoes/auditoria`; painel inicial com variação contra o período anterior; sino da barra superior com contagem. `FASE_ATUAL = 9`.
5. Testes: unitários (tarefa 2); integração (gerar_alertas abre e resolve; operador resolve, leitura não; views devolvem o pedido pago); e2e (relatório com período e exportação CSV abre; alerta resolvido some da lista; auditoria filtra).
6. Docs, decisão na base pelo MCP, commit.
