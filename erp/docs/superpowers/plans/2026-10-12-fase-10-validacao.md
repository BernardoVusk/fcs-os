# Fase 10 (Validação e preparação para uso): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o ERP pronto para virar a fonte de verdade da operação: estados de carregamento e erro em todas as rotas, acessibilidade básica conferida, auditoria de segurança, MFA do dono, rotina de backup com restauração documentada e testável, docs de implantação e backups, tema claro revisado por captura de tela, nenhum dado de teste no banco de desenvolvimento, `CLAUDE.md` raiz e memória atualizados, e os 14 critérios da seção 14 da spec conferidos com evidência.

**Architecture:** Nada de módulo novo. `loading.tsx`, `error.tsx` e `not-found.tsx` no grupo `(painel)`; MFA TOTP do Supabase Auth com inscrição em `/perfil`, verificação em `/login/verificar` e exigência de AAL2 no middleware quando o usuário tem fator; backup por GitHub Actions (`pg_dump` cifrado com `gpg` simétrico, artefato com 90 dias) mais job de restauração no projeto de teste por `workflow_dispatch`; capturas de tela por Playwright nos dois temas e três larguras para a revisão visual.

**Tech Stack:** o das fases anteriores. Nenhuma dependência nova.

Spec: seção 10 (Fase 10), seção 11 (segurança), seção 12 (custos), seção 13 (D4 hospedagem) e seção 14 (critérios).

## Regras fixadas

- Hospedagem (D4): o repositório fica pronto para Vercel e para Netlify; a escolha e a criação da conta são do usuário e ficam documentadas em `docs/implantacao.md` com a recomendação e o custo. Nenhum arquivo assume um host.
- MFA: opcional para operador e leitura, recomendada para o dono; quando o usuário tem um fator verificado, o login exige o código (AAL2) e o painel bloqueia até verificar. Desativar exige o código atual.
- Backup: semanal e sob demanda, cifrado antes de sair do runner, senha só em segredo do repositório; restauração só no projeto de teste, nunca no de produção, e sempre com confirmação explícita no `workflow_dispatch`.
- Dados de teste: todo teste limpa o que cria; o que sobrou de execuções interrompidas é removido do banco de dev nesta fase e a tabela `usuarios_app` fica só com usuários reais.
- Critérios da seção 14: cada um aponta para o teste ou a tela que o prova; o que não foi feito fica escrito como não feito.

## Tarefas

1. Estados: `loading.tsx` (skeleton), `error.tsx` e `not-found.tsx` no `(painel)` e `global-error.tsx`; conferir foco visível e rótulos dos controles sem texto.
2. MFA: inscrição, verificação e remoção em `/perfil`; `/login/verificar`; middleware exige AAL2 quando há fator; e2e do fluxo com o segredo TOTP do próprio teste.
3. Segurança: rodar `/auditoria-seguranca`, corrigir o que for achado, registrar o que não se aplica; verificação no CI de que a service role não vai para o bundle.
4. Backup: `.github/workflows/backup.yml` (dump cifrado semanal) e job de restauração no teste; `docs/backups-e-recuperacao.md`.
5. Implantação: `docs/implantacao.md` (Vercel e Netlify, variáveis, migrações, domínio, pg_cron, MCP em produção), `.env.example` conferido.
6. Revisão visual: capturas por Playwright em 1440, 1024 e 390 nos dois temas das telas principais; corrigir o que aparecer.
7. Limpeza do banco de dev; `CLAUDE.md` raiz; memória; `docs/validacao.md` com os 14 critérios e evidências; decisão na base; commit.
