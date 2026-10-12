# Fase 4 (Motor de custos e precificação): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calcular o custo por peça boa (material com desperdício, máquina, energia, preparo, acabamento, embalagem, complementares, fixo rateado, tudo com fator de falha onde cabe) e formar o preço por canal (equilíbrio, margem, markup) com inviabilidade explicada, a partir de parâmetros versionados, componentes configuráveis, impressoras com custo-hora e insumos com custo de reposição. Cada cálculo salvo é um snapshot reproduzível.

**Architecture:** `src/dominio/custos` (custo por peça) e `src/dominio/precos` (formação de preço) são puros, em `decimal.js`, e leem uma tabela de casos (`docs/formulas-de-custo.md` + `src/dominio/custos/casos.json`) nos testes. O banco guarda `parametros_custo` (versão vigente), `componentes_custo` (catálogo ligável), `impressoras` (campos de custo) e `calculos_custo` (snapshot imutável de entradas, resultado e versão do motor). A calculadora (`/catalogo/precificacao`) monta as entradas a partir de insumo, impressora, canal vigente e parâmetros, chama o domínio e mostra cenários lado a lado; salvar grava o snapshot. Produtos chegam na Fase 5: nesta fase o cálculo é "simulação" (sem produto) ou vinculado a um insumo de impressão; recálculo em lote e alerta `margem_reduzida` por produto ficam para a Fase 5, quando existem BOM e preço por canal.

**Tech Stack:** o da Fase 3.

Spec: seções 5.4, 7 (7.1 a 7.7), 10 (Fase 4) e Anexo A (A1 a A4).

## Regras fixadas

- Fator de falha `1/(1-f)` só em material, máquina, energia e preparo. Desperdício `w` só no material. Acabamento, embalagem e complementares nunca recebem `f`.
- Preço: `t` = soma das frações sobre o preço (comissão, pagamento, imposto, ads); `F` = fixos por unidade (taxa fixa, frete subsidiado, complementares por pedido). `P0 = (C+F)/(1-t)`, `Pm = (C+F)/(1-t-m)`, `Pk = (C(1+k)+F)/(1-t)`. Inviável quando o denominador <= 0, devolvendo `viavel: false` com motivo e margem máxima exclusiva. `margem_sensivel` quando o denominador fica entre 0 e 0,10.
- Arredondamento: precisão cheia no cálculo; componentes a 4 casas; custo por grama a 6; preço sugerido `ROUND_CEILING` a 2 casas; margens exibidas recalculadas no preço arredondado.
- Fixo rateado por hora (`custo_fixo_mensal / horas_produtivas_mes` vezes horas por peça com fator de falha), por peça (`custo_fixo_mensal / volume_mensal_estimado`) ou desligado. Fixo entra só em precificação, nunca em custo realizado.
- Custo do filamento vem de `custoDeReposicao(insumo)` (Fase 3); o snapshot guarda o valor e a origem. Taxas do canal vêm de `canais_venda_vigentes`; canal sem comissão bloqueia o cálculo daquele canal ("Não configurado"), nunca assume valor.
- Parâmetros são versionados: editar cria versão nova com `vigente_desde`; o cálculo referencia a versão. Impostos sem valor padrão.

## Tarefas

1. Domínio: `src/dominio/custos/{tipos,custo-peca,impressora}.ts`, `src/dominio/precos/{preco,resultado}.ts`, `casos.json` (A1 a A4 mais o caso da seção 7.4), testes `material`, `maquina`, `falha`, `rateio-fixo`, `multi-peca-ciclo`, `preco`, `markup-vs-margem`, `inviavel`, `arredondamento`, `snapshot` (recalcular a partir do snapshot reproduz o resultado). `docs/formulas-de-custo.md` com as fórmulas e a tabela de casos.
2. Migração `0010_custos.sql`: `parametros_custo` (versão, vigência, dados jsonb), `componentes_custo` (código, nome, grupo, método, ativo, ordem, parâmetros), `impressoras` (campos de custo e status), `calculos_custo` (snapshot imutável), seeds dos componentes padrão e de uma versão inicial de parâmetros com valores nulos onde não há dado real, RLS (dono edita parâmetros; dono e operador criam cálculos; cálculos sem update/delete), auditoria, ramo de busca para impressora e cálculo.
3. Dados e ações: parâmetros (vigente, histórico, nova versão), componentes (alternar ativo, editar parâmetros), impressoras (CRUD mínimo com custo-hora derivado), cálculos (salvar snapshot, listar histórico, obter, comparar com o custo atual do insumo).
4. Telas: `/configuracoes/parametros-custo` (versão vigente, formulário de nova versão, lista de componentes com interruptores), `/producao/impressoras` (lista e dialog com custo-hora calculado ao vivo), `/catalogo/precificacao` (calculadora: entradas da peça, insumo, impressora, canal; quebra por componente; cenários equilíbrio, margem e markup lado a lado; inviável explicado; salvar), `/catalogo/precificacao/historico` (cálculos salvos, diferença entre custo do snapshot e custo atual do insumo). Dashboard: cartão "Cálculos salvos". MCP `custos_regras` real (fórmulas resumidas, parâmetros vigentes, componentes ativos). `FASE_ATUAL = 4`; impressoras passam para fase 4 na navegação.
5. Testes: unitários da tarefa 1; integração (versão nova de parâmetros não altera cálculo salvo; leitura não grava cálculo; cálculo não aceita update); e2e (abrir a calculadora com o caso da seção 7.4 e conferir 47,49 e 71,71 na tela, salvar e ver no histórico).
6. Docs: `regras-de-negocio.md` (custos), `modelo-de-dados.md`, `integracao-claude-code.md`, `erp/CLAUDE.md`. Registrar a decisão na base pelo MCP. Commit.
