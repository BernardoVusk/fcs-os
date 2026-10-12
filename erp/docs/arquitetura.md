# Arquitetura

Next.js 16 (App Router) em `erp/`, Supabase (Postgres 17, Auth, Storage) como banco único da empresa, projeto `fcs-os` (dev e produção, até a Fase 10) e `fcs-os-teste` (testes de integração).

## Camadas

```
app/            rotas e layouts: só composição
componentes/    ui (shadcn), painel (shell e peças genéricas), <modulo>
acoes/          server actions: exigirEscrita -> zod -> dominio -> dados -> revalidatePath
dados/          consultas e escritas (server-only, cliente com sessão)
dominio/        regras puras e testadas (sem React, Next ou Supabase)
lib/            env, supabase (servidor, admin, proxy), auth (papeis, sessao), forms, formatos, tema
```

Dependência permitida: `app -> componentes -> acoes -> dominio, dados`. `dominio` não importa nada das outras camadas (lint bloqueia). Um arquivo `"use server"` só exporta funções assíncronas; constantes compartilhadas (tipos de canal, rótulos) vivem em `dominio/`.

## Sessão e permissão

- `src/proxy.ts` renova o cookie e manda deslogado para `/login`. Não decide permissão.
- Páginas chamam `exigirLeitura(area)`; actions chamam `exigirEscrita(area)`. Mapa em `lib/auth/papeis.ts`.
- O banco repete a regra com RLS (`app.papel_atual()`): a aplicação usa o cliente com a sessão do usuário, então uma falha de permissão na aplicação não vaza dado.
- Service role só em `lib/supabase/admin.ts` (criar usuário, listar e-mails) e em `ferramentas/`.

## Origem e auditoria

Todo cliente envia `x-origem` (`web`, `mcp`, `script`, `importacao`). O trigger `app.auditar()` grava antes, depois, usuário e origem em `auditoria`. Pela API HTTP sem cabeçalho vale `web`; só SQL direto (Management API) vale `script`.

## Decisões (ADR curtas)

- 2026-10-11: app dentro do repositório `Fcs OS` em `erp/`, migrações na raiz (`supabase/migrations/`) aplicadas por `ferramentas/migrar.mjs` via Management API, porque não há Docker nem CLI logada na máquina e a regra do workspace já era essa.
- 2026-10-11: RLS real por papel em vez de service role com checagem só na aplicação, porque o endpoint MCP (Fase 2) também acessa o banco.
- 2026-10-11: shadcn/ui (estilo radix-nova) com tokens próprios em vez de componentes manuais, porque o ERP é denso em tabelas, diálogos e formulários.
- 2026-10-11: `cacheComponents` desligado no `next.config.ts`. Toda página lê sessão e banco a cada request; com Cache Components cada `cookies()` exigiria Suspense e a sessão não poderia ser lida no layout.
- 2026-10-11: banco de teste é um segundo projeto Supabase Free (`fcs-os-teste`), porque não há Docker para rodar o Supabase local.
