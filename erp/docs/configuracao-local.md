# Configuração local

Pré-requisitos: Node 24, npm, Git. Sem Docker (o banco é remoto).

1. `cd erp && npm install`
2. Copiar `erp/.env.example` para `erp/.env.local` e preencher com os valores do projeto `fcs-os` (os mesmos do `.env` da raiz).
3. Aplicar migrações: `npm run migrar -- --alvo dev` (usa `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF` do `.env` da raiz).
4. Gerar tipos: `npm run tipos`.
5. Criar o primeiro usuário: `node ferramentas/criar-usuario.mjs --email=... --nome=... --senha=... --papel=dono`.
6. `npm run dev` e abrir `http://localhost:3000`.

Banco de teste: `node ferramentas/projeto-teste.mjs criar` (uma vez), depois `npm run migrar -- --alvo teste`. Se o projeto pausar por inatividade: `node ferramentas/projeto-teste.mjs restaurar`.

Consulta rápida ao banco: `node ferramentas/sql.mjs [--alvo teste] "select ..."` ou `--arquivo caminho.sql`.

Comandos: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integracao`, `npm run e2e` (precisa de `npx playwright install chromium` uma vez), `npm run build`, `npm run formatar`.
