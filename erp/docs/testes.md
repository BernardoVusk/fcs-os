# Testes

- Unitários (`npm test`): Vitest, arquivos `*.test.ts` ao lado do código. Cobrem domínio, papéis, formatos, navegação, formulários e as ferramentas de migração. Rodam no CI.
- Integração (`npm run test:integracao`): Vitest contra o projeto `fcs-os-teste`, usuários criados e removidos pelo próprio teste. Cobrem RLS por papel, auditoria com origem e busca global. Só local (precisam de segredo).
- E2E (`npm run e2e`): Playwright contra `npm run dev` com um usuário dono real (`E2E_EMAIL` e `E2E_SENHA` em `erp/.env.local`). Cobrem login, navegação, tema, criação e busca de categoria, a página pública `/sorteio` sem login e ausência de rolagem horizontal em 1440, 1024 e 390 px. Capturas em `testes/relatorios/capturas/`.

Regra: função nova no domínio nasce com teste; migração nova que muda permissão ganha caso em `rls.test.ts`; tela nova ganha pelo menos um fluxo e2e.
