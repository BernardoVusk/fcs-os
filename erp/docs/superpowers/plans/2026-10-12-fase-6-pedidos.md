# Fase 6 (Pedidos e clientes): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar pedidos (manuais ou importados por CSV do canal) com itens, descontos, taxas do canal, frete cobrado e pago; status configuráveis com linha do tempo; resumo financeiro do pedido (receita bruta, base de vendas, taxas, valor a receber, imposto estimado, custo estimado e realizado, resultado); clientes mínimos; criação de ordem de produção a partir do item; baixa de peças prontas na expedição; importação idempotente por arquivo e por código externo.

**Architecture:** `pedidos` tem chave de idempotência (canal, código externo). Status é uma lista editável com três flags: `gera_recebivel` (exatamente um status), `baixa_estoque` (expedição) e `fechado`. Mudar status passa por uma função SQL (`mudar_status_pedido`) que grava o evento, congela o custo estimado dos itens ao entrar no status que gera recebível e baixa as peças prontas (`movimentacoes_produto` tipo venda, ao custo médio) ao entrar no status de expedição; o recebível em si nasce na Fase 7, quando `lancamentos` existir, e a função já deixa o gancho (`data_pagamento`). O resumo financeiro do pedido é domínio puro (`dominio/vendas/resumo-pedido.ts`, caso C1 do Anexo A). A importação lê CSV com mapeamento de colunas por canal (defaults por tipo de canal, editáveis na tela porque não há arquivo real de pedidos no repositório) e é idempotente por hash do arquivo e por código externo.

**Tech Stack:** o da Fase 5. Parser CSV da Fase 5 reaproveitado.

Spec: seções 5.6, 7.7, 10 (Fase 6) e Anexo A (C1).

## Regras fixadas

- Base das taxas percentuais = receita bruta menos descontos do vendedor; frete fica fora. Base de vendas = base das taxas + frete cobrado do cliente. Valor a receber = base de vendas menos taxas do canal menos frete pago pela empresa. Imposto estimado é análise, nunca lançamento. Custo estimado congela ao entrar no status que gera recebível; custo realizado vem da média das peças prontas na expedição.
- Taxas pré-preenchidas pelo canal vigente, editáveis no pedido; quando o CSV traz as taxas reais, elas prevalecem com origem `canal`.
- Reimportar o mesmo arquivo (hash) não faz nada; linha com código externo conhecido faz upsert do pedido sem recriar eventos; status importado só avança, nunca volta.
- Cliente é opcional e mínimo (nome, contato); exclusão anonimiza.
- Cancelamento após expedição exige devolução explícita (movimentação de produto tipo devolucao).

## Tarefas

1. Migração `0014_vendas.sql`: `clientes`, `pedidos_status` (seed: recebido, aguardando pagamento, pagamento aprovado [gera_recebivel], aguardando produção, em produção, em acabamento, em embalagem, pronto para envio, enviado [baixa_estoque], concluído [fechado], cancelado [fechado], devolvido [fechado]), `pedidos` (único canal + código externo), `pedidos_itens`, `pedidos_eventos`, `importacoes` (hash único), função `mudar_status_pedido`, `anonimizar_cliente`, ramos da busca (pedido, cliente), FK `ordens_producao.pedido_item_id`. Domínio: `dominio/vendas/{resumo-pedido,importacao-pedidos,status}.ts` com testes (C1; parser com mapeamento; status só avança).
2. Dados e ações: clientes (CRUD, anonimizar), status (lista, editar flags com a regra do único `gera_recebivel`), pedidos (criar com itens e taxas do canal, editar enquanto aberto, mudar status, criar OP do item, cancelar, devolver), importação (hash, mapeamento, relatório).
3. Telas: `/vendas/pedidos` (lista por status com resumo), `/vendas/pedidos/novo`, `/vendas/pedidos/[id]` (itens, resumo financeiro, linha do tempo, ações), `/vendas/clientes`, `/vendas/importar`, `/configuracoes/status-pedido`. Dashboard: faturamento do período (base de vendas dos pedidos pagos) e pedidos abertos. `FASE_ATUAL = 6`.
4. Testes: unitários (C1, parser, regra de status); integração (importar duas vezes não duplica; mudar para pagamento aprovado congela custo; enviar baixa peças prontas ao custo médio e falha sem peça; cancelar depois de enviado exige devolução; leitura não cria pedido); e2e (pedido manual do início ao envio, com OP criada do item).
5. Docs (`regras-de-negocio.md`, `modelo-de-dados.md`, `erp/CLAUDE.md`), decisão na base pelo MCP, commit.
