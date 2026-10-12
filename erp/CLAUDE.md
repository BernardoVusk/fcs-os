# FCS ERP: instruções permanentes

Aplicação Next.js 16 do sistema de gestão da FCS 3D STUDIO. Spec aprovada: `docs/superpowers/specs/2026-10-11-erp-fcs-design.md`. Plano da fase em andamento em `docs/superpowers/plans/`. Antes de propor mudança de arquitetura, ler `docs/arquitetura.md` e consultar a base de conhecimento pelo MCP `fcs-erp` (`kb_decisoes` com o módulo e `kb_buscar` com o tema) ou pela skill `/kb-buscar`. Ao concluir tarefa que gerou decisão ou solução não trivial, perguntar se salva com `/kb-salvar` ou `/kb-decisao`. Detalhes em `docs/integracao-claude-code.md`.

## Comandos

`npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integracao` (projeto de teste), `npm run e2e`, `npm run migrar -- --alvo dev|teste`, `npm run tipos`, `npm run formatar` (rodar antes de commitar; toda a base já está formatada), `node ferramentas/sql.mjs "select ..."`.

## Regras de camadas

- `src/dominio/`: regras puras, sem React, Next ou Supabase. Toda fórmula com teste ao lado e documentada em `docs/formulas-de-custo.md` ou `docs/regras-de-negocio.md`.
- `src/acoes/`: server actions, sempre `exigirEscrita(area)` antes de qualquer coisa, zod depois, `revalidatePath` no fim. Arquivo `"use server"` só exporta funções assíncronas; constantes vão para `dominio/`.
- `src/dados/`: só consultas, `import "server-only"`, cliente com sessão (`clienteServidor`). Service role só em `lib/supabase/admin.ts` e `ferramentas/`.
- `src/app/`: composição. Nenhuma regra de negócio em componente.

## Banco

- Migração nova = arquivo `supabase/migrations/NNNN_nome.sql` na raiz do repositório, aplicado em dev e em teste (`npm run migrar -- --alvo dev` e `--alvo teste`), seguido de `npm run tipos`. Nunca editar migração aplicada.
- Toda tabela nasce com RLS e, se for cadastro, com trigger `app.auditar()`.
- Nunca inventar número: campo sem dado real fica nulo e a tela mostra "Sem dados" ou "Não configurado".
- O PostgREST roda com `safeupdate`: todo UPDATE ou DELETE precisa de WHERE, inclusive em tabela temporária dentro de função (`where true` resolve). A Management API, usada pelo `migrar.mjs`, não tem essa trava, então o erro só aparece em runtime.
- Em plpgsql, `text[] || 'literal'` é lido como concatenação de arrays e falha com "malformed array literal"; usar `array_append`.
- Parâmetro com default só depois dos obrigatórios. Para tornar opcional um parâmetro de função já aplicada, nova migração com `drop function` e `create` na nova ordem; o PostgREST chama por nome, então a ordem não afeta o código.
- Escrita em mais de uma tabela (confirmar compra, movimentar estoque, estornar) é função SQL `security invoker` chamada por `rpc`, nunca várias chamadas da aplicação.

## Padrões

- Português em código, rotas, tabelas e textos. Sem emoji. Sem travessão.
- Erros de validação são chaves traduzidas por `erroPt()` (`src/lib/erros-pt.ts`).
- Percentual digitado em por cento, guardado como fração.
- Dinheiro e custo em decimal (`decimal.js` no domínio, `numeric` no banco), nunca float em cálculo.
- Comandos de shell com mais de 8 KB falham no Windows: escrever arquivos grandes em partes.

## Áreas críticas

Permissões (`lib/auth/papeis.ts` e policies), auditoria (`app.auditar`), servidor MCP (`src/mcp/`, escopos e filtro de segredos), motor de custos (Fase 4), estoque (Fase 3), lançamentos (Fase 7). Mudança nessas áreas exige teste de integração novo.

## Antes de dizer que terminou

`npm run lint && npm run typecheck && npm test && npm run build`. Se tocou em banco ou permissão, `npm run test:integracao`. Se tocou em tela, `npm run e2e`.
