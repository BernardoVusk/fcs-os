# Fase 5 (Produtos, impressoras e produção): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastrar produtos com variações, lista de materiais (BOM), arquivos e preços por canal; ligar o motor de custos ao produto (custo atual, margem por canal, recálculo em lote e alerta de margem reduzida); registrar ordens de produção com consumo real por lote, peças aprovadas e perdidas, custo realizado contra estimado, estoque de peças prontas e fila por impressora.

**Architecture:** Produto é a entidade que amarra insumo de impressão, impressora padrão, tempos e BOM; o cálculo de produto usa o motor da Fase 4 com entradas montadas a partir da ficha e grava `calculos_custo` com `produto_id`. A ordem de produção nasce de um produto (ou variação), reserva o lote em uso e, ao concluir, uma função SQL atômica (`concluir_ordem_producao`) consome os lotes pela função `movimentar_estoque` da Fase 3, calcula o custo realizado (só variável, ao custo do lote), dá entrada em `movimentacoes_produto` (média móvel por produto) e fecha a ordem. Reabrir estorna tudo, nunca apaga. Arquivos ficam em buckets privados com URL assinada; fotos em bucket público só de imagem.

**Tech Stack:** o da Fase 4, mais Storage do Supabase (buckets `arquivos-produto` privado e `fotos-produto` público) e leitura de CSV (parser próprio, sem dependência).

Spec: seções 5.5, 7.6, 10 (Fase 5) e os critérios 4 e 5 da seção 14.

## Regras fixadas

- Variação herda do produto tudo que não sobrescrever (peso, tempo, insumo de impressão, atributos). BOM por peça entra em C; BOM por pedido entra em F.
- `produtos.custo_atual` e `calculo_atual_id` são cache do último cálculo com `motivo = recalculo` ou `manual`; recálculo em lote roda para produtos cuja BOM usa um insumo cujo custo de reposição mudou e abre alerta `margem_reduzida` quando a margem no preço vigente do canal cai abaixo da margem alvo (do produto ou do parâmetro padrão).
- Preço por canal tem vigência; a margem exibida é recalculada no preço vigente com o custo atual.
- Ordem de produção: estados fila, imprimindo, acabamento, concluida, cancelada. Concluir é transição única e atômica; custo realizado = material ao custo do lote + horas reais x (depreciação + manutenção + consumíveis + energia) + minutos reais x mão de obra + complementares; peças perdidas são absorvidas pelas boas; sem peça boa o custo vai para a linha "perda de produção" e não há entrada de acabado. Reabrir gera estornos e volta para acabamento.
- Estoque de peças prontas por produto e variação em `movimentacoes_produto`, valorado pela média móvel.
- Importação do catálogo (`dados/catalogo/*.csv`): cria produtos em rascunho com título, canal, id externo e preço vigente; idempotente por (canal, id externo); nada é inventado para peso ou tempo.
- Arquivo grande pode ficar fora do storage: caminho externo mais hash; o sistema não copia.

## Tarefas

1. Migração `0012_produtos.sql`: `produtos`, `produtos_variacoes`, `produtos_materiais` (BOM), `produtos_precos_canal`, `produtos_arquivos`, buckets, `manutencoes`, FKs de `calculos_custo.produto_id` e `variacao_id`, campos de cache no produto, RLS, auditoria, ramos da busca (produto, variação). Domínio: `src/dominio/produtos/{heranca,bom,importacao-csv}.ts` com testes (herança de variação, BOM por peça e por pedido, parser dos CSVs reais de `dados/catalogo`).
2. Migração `0013_producao.sql`: `ordens_producao` (código OP-0001 por sequência), `ordens_consumo`, `movimentacoes_produto`, view `estoque_produtos`, funções `concluir_ordem_producao` e `reabrir_ordem_producao` (estornos), ramo da busca (ordem). Domínio: `src/dominio/producao/{custo-realizado,carga}.ts` com testes (custo realizado com perdas, nenhuma aprovada, carga por impressora no período).
3. Dados e ações de produtos: CRUD de produto e variações, BOM, preços por canal, upload e URL assinada de arquivos, importação CSV, cálculo de produto (monta entradas pela ficha e grava `calculos_custo` com `produto_id`, atualiza cache), recálculo em lote com alerta `margem_reduzida`. Ligação com a Fase 3: confirmar compra marca produtos afetados (`custo_atualizado_em = null`).
4. Dados e ações de produção: ordens (criar a partir de produto, mudar estado, registrar tempos e consumo real por lote, concluir, reabrir, cancelar), impressoras completas (horas de uso, manutenções que somam horas e custo).
5. Telas: `/catalogo/produtos` (lista com custo atual, margem por canal e situação), `/catalogo/produtos/novo`, `/catalogo/produtos/[id]` (abas ficha, variações, materiais, preços, arquivos, custo), `/catalogo/produtos/importar`; `/producao/fila` (quadro por estado e lista por prazo, carga por impressora), `/producao/ordens/nova`, `/producao/ordens/[id]`; `/producao/impressoras/[id]` (manutenções e horas). Dashboard: pedidos em produção vira "Ordens em andamento" e "Peças prontas". MCP `produto_custo` real. `FASE_ATUAL = 5`.
6. Testes: unitários das tarefas 1 e 2; integração (concluir ordem gera consumo correto por lote, custo realizado, entrada de acabado e falha se lote insuficiente; reabrir estorna; recálculo abre alerta; importar o mesmo CSV duas vezes não duplica; arquivo privado não abre sem URL assinada); e2e (criar produto, calcular, criar ordem, concluir, ver peças prontas e consumo; responsivo da fila).
7. Docs: `regras-de-negocio.md` (produtos e produção), `modelo-de-dados.md`, `integracao-claude-code.md`, `erp/CLAUDE.md`. Registrar decisões na base pelo MCP. Commit.
