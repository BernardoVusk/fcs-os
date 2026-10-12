# Fase 3 (Insumos, compras e estoque): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastrar filamentos e demais insumos, registrar compras com rateio de frete e desconto, gerar lotes (um rolo = um lote), movimentar estoque de forma rastreável (entrada, consumo, saída, ajuste, perda, devolução, estorno), calcular custo por grama e custo médio ponderado, bloquear estoque negativo silencioso e avisar estoque abaixo do mínimo.

**Architecture:** O banco é a fonte da verdade do estoque: lotes guardam quantidade e valor (unitário é derivado), movimentações são o razão imutável, e duas funções SQL atômicas (`confirmar_compra`, `movimentar_estoque`) fazem toda escrita que envolve mais de uma tabela. O domínio TypeScript (`src/dominio/estoque`) implementa as mesmas regras de rateio, custo médio e conversão para prévias na tela e para os testes com os casos do Anexo B da spec; os testes de integração repetem os mesmos números contra as funções SQL.

**Tech Stack:** o da Fase 2, mais `decimal.js` (já instalado) no domínio.

Spec: seções 5.3, 5.9, 7.6, 10 (Fase 3) e Anexo A (B1, B2).

## Regras fixadas

- Quantidade em estoque sempre na unidade base do insumo (filamento em gramas). Compra de filamento é em rolos (`un`) com `peso_util_g` por rolo; cada rolo vira um lote.
- Landed da linha = `valor_linha - desconto_item - desconto_pedido_rateado + frete_rateado + outros_rateados`. Rateio por valor (padrão) ou por quantidade; parcelas com 4 casas; a linha de maior base absorve o resíduo.
- Custo médio do insumo = soma do valor dos lotes com saldo / soma das quantidades (6 casas). `ultimo_custo` = custo unitário do último lote comprado. O motor de custos (Fase 4) usa `origem_custo` do insumo: `media` (padrão), `ultima_entrada` ou `manual`.
- Saída valorada ao custo do lote; ao zerar o lote, a saída leva o valor restante. Lote em uso insuficiente divide com o lote mais antigo com saldo e gera alerta `lote_dividido`.
- Estoque negativo: bloqueado, exceto consumo de produção com `permitir_negativo` e justificativa (gera `estoque_negativo` e marca o lote `divergente`). Ajuste negativo, perda, devolução e saída comum nunca aceitam.
- Alerta `estoque_baixo` aberto quando saldo < mínimo e resolvido automaticamente quando volta.
- Estorno de movimentação cria movimentação oposta; nada é apagado.

## Tarefas

1. Migração `0007_estoque.sql`: fornecedores, insumos, compras, compras_itens, lotes_insumo, movimentacoes_estoque, view `estoque_atual`, funções `app.recalcular_custos_insumo`, `app.verificar_estoque_minimo`, `public.confirmar_compra`, `public.movimentar_estoque`, `public.estornar_movimentacao`, RLS, auditoria, ramos de busca (insumo, lote, fornecedor). Domínio: `rateio.ts`, `custo-medio.ts`, `conversao.ts` com testes B1 e B2.
2. Dados e ações: insumos (listar com estoque, obter, salvar, inativar), fornecedores (listar, salvar), compras (listar, obter com itens, salvar rascunho com itens, confirmar, cancelar), movimentações (listar com filtros, registrar, estornar).
3. Telas: `/estoque/insumos` (+ dialog novo, filtros por tipo), `/estoque/insumos/[id]` (ficha, lotes, movimentações, ações de ajuste/perda/consumo), `/estoque/fornecedores`, `/estoque/compras`, `/estoque/compras/nova`, `/estoque/compras/[id]` (confirmar), `/estoque/movimentacoes`. Dashboard: materiais abaixo do mínimo e consumo de filamento no período. MCP: `estoque_insumo`. `FASE_ATUAL = 3`.
4. Testes: unitários (rateio com resíduo, custo médio B2, conversão), integração (confirmar_compra reproduz B1; sequência B2 com lote dividido; negativo bloqueado; override com alerta; RLS operador escreve, leitura não), e2e (insumo, compra, confirmação, estoque na tela).
5. Docs: regras-de-negocio.md (valoração), modelo-de-dados.md, erp/CLAUDE.md. Commit.
