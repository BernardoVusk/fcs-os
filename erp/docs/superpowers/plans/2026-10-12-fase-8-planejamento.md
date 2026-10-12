# Fase 8 (Planejamento): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Planejamento de conteúdo e tarefas numa só tabela de itens (tarefa, conteúdo, projeto), com calendário mensal e semanal, quadro por status, lista por prazo, tabela de conteúdos, campanhas, modelos editáveis, recorrência, duplicação, checklist, relações, histórico e ligação com produto. Dashboard mostra o que vence nos próximos 7 dias. O Claude Code lê o item planejado pelo MCP (`plan_obter`, `plan_listar`) para produzir a peça com `/carrossel`.

**Architecture:** Molde do módulo de marketing da FX (mês na URL, drawer `?item=`, quadro, lista, calendário), generalizado. Regras puras em `src/dominio/planejamento/{tipos,calendario,filtros}.ts` (grade do calendário, filtros sem acento, ordenação, quadro e movimento otimista, checklist). Status por tipo vive em `plan_fluxos` (lista editável pelo dono, com `fechado` e `padrao`), validado por trigger. Histórico por trigger em `plan_historico`. Recorrência reaproveita `ocorrencias()` do financeiro; item gerado é único por (recorrência, prazo).

**Tech Stack:** o das fases anteriores. Sem biblioteca de arrastar: o quadro usa arrastar nativo do HTML com menu de "mover para" como alternativa de teclado.

Spec: seções 4 (rotas de planejamento), 5.8 e 10 (Fase 8); critério 10 da seção 14.

## Regras fixadas

- Mês de um item = mês do prazo (ou do início, se não houver prazo); sem data fica no backlog, visível no calendário numa seção "Sem data".
- Status é texto validado contra `plan_fluxos` do mesmo tipo. Entrar num status `fechado` grava `concluido_em` (e `publicado_em` quando o código é `publicado`); sair de um fechado limpa.
- Atrasado é derivado: prazo antes de hoje e status não fechado. Nada é gravado.
- Checklist nasce do modelo ou do padrão do formato (`CHECKLIST_PADRAO`), editável no item. Progresso = feitos / total.
- Duplicar copia tudo menos datas, status (volta ao padrão), checklist (volta tudo a não feito), `concluido_em`, `publicado_em` e métricas.
- Modelo editável na tela: campos padrão em jsonb e checklist padrão. Recorrência aponta para um modelo e gera itens até 60 dias à frente, únicos por (recorrência, prazo).
- Permissões: todo usuário ativo lê; dono e operador escrevem itens, campanhas, modelos e recorrências; só o dono edita os fluxos de status.
- MCP: `plan_listar` (mês, tipo, status, termo) e `plan_obter` (id) no escopo `operacao:ler`, só leitura.

## Tarefas

1. Migração `0016_planejamento.sql`: `plan_fluxos` (seed por tipo), `plan_campanhas`, `plan_modelos`, `plan_recorrencias`, `plan_itens`, `plan_relacoes`, `plan_historico`, triggers (validar status, carimbar fechado, histórico), RLS, ramo da busca (`item_plano`).
2. Domínio: `dominio/planejamento/{tipos,calendario,filtros}.ts` com testes (grade do mês, semana, filtros sem acento, ordenação, quadro e mover, checklist, leitura de jsonb).
3. Dados e ações: listar itens por mês e filtros, obter com relações e histórico, fluxos, campanhas, modelos, recorrências; ações salvar item, mudar status, alternar checklist, duplicar, excluir (dono), relações, campanhas, modelos, recorrências e gerar.
4. Telas: `/planejamento` (calendário mensal, lista no celular, `?mes=`, `?semana=` para a visão semanal, drawer `?item=`), `/planejamento/quadro` (por tipo, arrastar e mover), `/planejamento/lista` (filtros rápidos: hoje, atrasados, semana, sem data), `/planejamento/conteudos`, `/planejamento/campanhas`, `/planejamento/modelos` (modelos e recorrências), `/planejamento/itens/novo`, `/planejamento/itens/[id]`. Criação rápida pelo botão Novo. Dashboard: próximos 7 dias e atrasados. `FASE_ATUAL = 8`.
5. MCP `plan_listar` e `plan_obter`; skill `/carrossel` passa a ler o item planejado quando houver.
6. Testes: unitários (tarefa 2); integração (status inválido rejeitado, fechado carimba, histórico, recorrência única por prazo, relação não reflexiva, leitura não escreve, busca acha item); e2e (criar item rápido, ver no calendário, abrir drawer, marcar checklist, mover no quadro).
7. Docs, decisão na base pelo MCP, commit.
