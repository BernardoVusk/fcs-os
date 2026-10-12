# Fase 1 (Fundação) do ERP FCS: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a aplicação `erp/` logável, com papéis e RLS reais, design system da marca, shell de navegação, busca global, telas de configuração (canais, categorias, unidades, usuários), dashboard vazio honesto, banco de teste isolado, testes unitários, de integração e e2e, CI e documentação.

**Architecture:** Next.js 16 App Router em `erp/`, server components e server actions, Supabase com sessão em cookie (`@supabase/ssr`) para que RLS valha para o usuário, service role só em scripts e em ações administrativas isoladas. Regras puras em `src/dominio` e `src/lib/auth`, acesso a dados em `src/dados`, ações em `src/acoes`. Migrações SQL na raiz do repositório (`supabase/migrations/`), aplicadas pela Management API por um script próprio, em dois alvos: `dev` (projeto `fcs-os`) e `teste` (projeto `fcs-os-teste`).

**Tech Stack:** Next 16.4, React 19.3, TypeScript 7, Tailwind 4.3, shadcn (Radix), lucide-react, cmdk, @tanstack/react-table 8, @supabase/ssr 0.12, supabase-js 2, zod 4, Vitest 5, Playwright 1.64, Node 24, npm.

Spec de referência: `erp/docs/superpowers/specs/2026-10-11-erp-fcs-design.md` (seções 3, 4, 5.1, 5.9, 5.10, 8, 9, 10 Fase 1, 11, 14).

## Global Constraints

- Node >= 24, npm (lockfile v3). Nunca pnpm, yarn ou bun aqui.
- Idioma de código, rotas, tabelas e textos: português do Brasil. Sem emoji. Sem travessão em texto de interface, documentação ou commit (usar vírgula, ponto ou dois-pontos).
- Nomes de arquivo em kebab-case, exceto componentes React (PascalCase, `.tsx`).
- `src/dominio/**`, `src/lib/auth/papeis.ts`, `src/lib/forms.ts`, `src/lib/formatos/**` e `src/componentes/painel/navegacao.ts` não importam React, Next nem Supabase. Lint falha se importarem.
- Nenhum uso de `SUPABASE_SERVICE_ROLE_KEY` fora de módulo que comece com `import "server-only"` ou de script em `ferramentas/`. Nenhuma variável `NEXT_PUBLIC_*` nesta fase.
- RLS ligado em toda tabela criada. Toda tabela de cadastro tem trigger `app.auditar()`.
- Migrações: um arquivo `supabase/migrations/NNNN_nome.sql` por mudança, numeração sequencial de 4 dígitos, nunca editar migração já aplicada. Aplicar sempre em `dev` e em `teste`.
- Dinheiro em `numeric(14,2)`; percentuais como fração (0.14 = 14 %) em `numeric(7,6)`; entrada do usuário em percentual ("14,5") convertida no servidor.
- Mensagens de erro de validação são chaves (`"nome_obrigatorio"`) traduzidas por `erroPt()`.
- Nunca inventar número: valor sem dado real aparece como "Sem dados" ou "Não configurado".
- Tema escuro é o padrão; tokens da seção 8.2 da spec. Cookie `fcs-tema`.
- Commits locais por tarefa, sem push (o push é feito pelo usuário com `/salvar`). Mensagem no imperativo, em português, terminando com a linha de atribuição definida na sessão.
- Nada é executado contra o projeto `fcs-os` (dev) que não seja migração versionada, leitura ou criação do primeiro usuário. Testes de integração só rodam no projeto `fcs-os-teste` e se recusam a rodar em outro ref.

## Mapa de arquivos da Fase 1

```
erp/
  package.json, tsconfig.json, next.config.ts, postcss.config.mjs, eslint.config.mjs, .prettierrc,
  vitest.config.ts, vitest.integracao.config.ts, playwright.config.ts, components.json, .env.example,
  CLAUDE.md, AGENTS.md (gerado pelo create-next-app), README.md, public/logo.png
  ferramentas/
    env.mjs               carrega ../.env e ./.env.local (process.loadEnvFile)
    supabase-api.mjs      consultar(ref, sql) e api.get/post na Management API
    migracoes.mjs (+test) pendentes(aplicadas, arquivos), puro
    migrar.mjs            aplica migrações pendentes em --alvo dev|teste
    projeto-teste.mjs     criar | status | restaurar | chaves do projeto fcs-os-teste
    tipos.mjs             gera src/tipos/banco.ts
    criar-usuario.mjs     cria usuário auth + linha em usuarios_app
  src/
    proxy.ts              renova sessão; deslogado vai para /login
    app/
      layout.tsx, globals.css
      (auth)/layout.tsx, (auth)/login/page.tsx, (auth)/login/acoes.ts, (auth)/login/FormLogin.tsx, (auth)/sem-acesso/page.tsx
      (painel)/layout.tsx, (painel)/page.tsx, (painel)/perfil/page.tsx
      (painel)/configuracoes/canais/page.tsx, canais/[id]/page.tsx
      (painel)/configuracoes/categorias/page.tsx
      (painel)/configuracoes/unidades/page.tsx
      (painel)/configuracoes/usuarios/page.tsx
    componentes/ui/       shadcn (gerado)
    componentes/painel/   navegacao.ts (+test), Icone.tsx, Sidebar.tsx, BarraTopo.tsx, SeletorTema.tsx,
                          busca-agrupar.ts (+test), BuscaGlobal.tsx, TabelaDados.tsx, CartaoIndicador.tsx,
                          EstadoVazio.tsx, Banner.tsx, SeletorPeriodo.tsx, CampoErro.tsx
    componentes/configuracoes/ FormCanal.tsx, FormTaxas.tsx, TabelaCanais.tsx, FormCategoria.tsx, TabelaCategorias.tsx,
                          FormUnidade.tsx, FormUsuario.tsx, BotaoAcao.tsx
    acoes/sessao.ts, acoes/busca.ts, acoes/configuracoes/{canais,categorias,unidades,usuarios}.ts
    dados/alertas.ts, dados/configuracoes/{canais,categorias,unidades,usuarios}.ts
    dominio/README.md
    lib/env.ts, lib/tema.ts (+test), lib/fontes.ts, lib/utils.ts (shadcn), lib/forms.ts (+test), lib/erros-pt.ts
    lib/supabase/servidor.ts, admin.ts, proxy.ts
    lib/auth/papeis.ts (+test), sessao.ts
    lib/formatos/numero.ts (+test), moeda.ts (+test), data.ts (+test)
    tipos/banco.ts        gerado
  testes/integracao/ambiente.ts, rls.test.ts, auditoria.test.ts, busca.test.ts
  testes/e2e/login.spec.ts, navegacao.spec.ts, configuracoes.spec.ts, responsivo.spec.ts
  docs/arquitetura.md, modelo-de-dados.md, regras-de-negocio.md, configuracao-local.md,
       variaveis-de-ambiente.md, design-system.md, testes.md, referencias-visuais/{README.md,fontes.md,*.jpg,*.png}
supabase/migrations/0001_extensoes.sql, 0002_base.sql, 0003_configuracao.sql, 0004_busca.sql
supabase/seed/README.md
.github/workflows/ci.yml
```

Ordem das tarefas: 1 esqueleto, 2 ferramentas de banco, 3 migração base, 4 migração de configuração, 5 busca, 6 clientes e papéis, 7 design system, 8 login, 9 shell, 10 busca na interface, 11 componentes de dados, 12 configurações, 13 dashboard, 14 testes de integração, e2e e CI, 15 documentação.

---

### Task 1: Esqueleto do projeto `erp/`

**Files:**
- Create: `erp/` via create-next-app; depois `erp/.prettierrc`, `erp/vitest.config.ts`, `erp/.env.example`
- Modify: `erp/package.json` (scripts), `erp/eslint.config.mjs`, `erp/src/app/page.tsx`, `.gitignore` (raiz)

**Interfaces:**
- Produces: scripts npm `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:integracao`, `e2e`, `migrar`, `tipos`, `formatar`; alias `@/*` para `src/*`.

- [ ] **Step 1: Criar o projeto**

Na raiz do repositório (`Fcs OS`):

```bash
npx --yes create-next-app@latest erp --ts --tailwind --eslint --app --src-dir --use-npm --import-alias "@/*" --yes --disable-git --no-agent-feedback
```

Esperado: pasta `erp/` com `src/app/{layout.tsx,page.tsx,globals.css}`, `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `AGENTS.md`, `node_modules/`.

- [ ] **Step 2: Instalar dependências da fase**

```bash
cd erp
npm install @supabase/ssr@^0.12.7 @supabase/supabase-js@^2.117 zod@^4.6 server-only lucide-react@^1.55 cmdk@^1.1 @tanstack/react-table@^8 decimal.js@^10.6 date-fns@^4.4 @date-fns/tz@^1.5 sonner
npm install -D vitest@^5 @vitejs/plugin-react@^6 jsdom@^30 @testing-library/react@^16 @playwright/test@^1.64 prettier@^3.9
```

- [ ] **Step 3: Scripts e configurações**

Substituir o bloco `scripts` do `erp/package.json` por:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run --config vitest.config.ts",
  "test:watch": "vitest --config vitest.config.ts",
  "test:integracao": "vitest run --config vitest.integracao.config.ts",
  "e2e": "playwright test",
  "migrar": "node ferramentas/migrar.mjs",
  "tipos": "node ferramentas/tipos.mjs",
  "formatar": "prettier --write \"src/**/*.{ts,tsx,css}\" \"ferramentas/**/*.mjs\" \"testes/**/*.ts\""
}
```

Criar `erp/.prettierrc`:

```json
{ "printWidth": 100, "singleQuote": false, "semi": true, "trailingComma": "all" }
```

Criar `erp/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "ferramentas/**/*.test.mjs"],
    environment: "node",
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
```

Em `erp/eslint.config.mjs`, acrescentar ao array `defineConfig([...])`, depois dos spreads gerados, a regra que isola o domínio:

```js
{
  files: [
    "src/dominio/**/*.ts",
    "src/lib/auth/papeis.ts",
    "src/lib/forms.ts",
    "src/lib/formatos/**/*.ts",
    "src/componentes/painel/navegacao.ts",
    "src/componentes/painel/busca-agrupar.ts",
  ],
  rules: {
    "no-restricted-imports": [
      "error",
      { patterns: ["react", "react/*", "next", "next/*", "@supabase/*", "@/dados/*", "@/acoes/*", "@/componentes/ui/*"] },
    ],
  },
},
```

Criar `erp/.env.example`:

```bash
# Runtime da aplicação. Copiar para erp/.env.local (nunca versionar).
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=
# Só no servidor: criação de usuários. Nunca em NEXT_PUBLIC_*
SUPABASE_SERVICE_ROLE_KEY=
# Usuário dos testes e2e (criar com ferramentas/criar-usuario.mjs)
E2E_EMAIL=
E2E_SENHA=
```

Acrescentar ao `.gitignore` da raiz:

```
# ERP
erp/.env*
!erp/.env.example
erp/.next/
erp/node_modules/
erp/testes/relatorios/
erp/playwright-report/
erp/test-results/
```

- [ ] **Step 4: Limpar o boilerplate e conferir o build**

Substituir `erp/src/app/page.tsx` por:

```tsx
export default function Pagina() {
  return <main className="p-8">FCS ERP</main>;
}
```

Apagar `erp/public/*.svg` gerados. Rodar:

```bash
cd erp && npm run lint && npm run typecheck && npm run build
```

Esperado: lint sem erro, `tsc` sem erro, build com a rota `/`.

- [ ] **Step 5: Commit**

```bash
git add .gitignore erp
git commit -m "erp: esqueleto Next.js da Fase 1"
```

---

### Task 2: Ferramentas de banco (env, Management API, migrações, projeto de teste, tipos)

**Files:**
- Create: `erp/ferramentas/env.mjs`, `erp/ferramentas/supabase-api.mjs`, `erp/ferramentas/migracoes.mjs`, `erp/ferramentas/migracoes.test.mjs`, `erp/ferramentas/migrar.mjs`, `erp/ferramentas/projeto-teste.mjs`, `erp/ferramentas/tipos.mjs`, `supabase/migrations/0001_extensoes.sql`, `supabase/seed/README.md`

**Interfaces:**
- Produces: `carregarEnv()`, `exigirEnv(nome)`, `consultar(ref, sql)`, `api.get/post`, `pendentes(aplicadas, arquivos)`; comandos `npm run migrar -- --alvo dev|teste`, `node ferramentas/projeto-teste.mjs criar|status|restaurar|chaves`, `npm run tipos`.
- Env no `.env` da raiz: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (já existem) e, após o Step 7: `SUPABASE_TESTE_PROJECT_REF`, `SUPABASE_TESTE_URL`, `SUPABASE_TESTE_ANON_KEY`, `SUPABASE_TESTE_SERVICE_ROLE_KEY`, `SUPABASE_TESTE_DB_PASSWORD`.

- [ ] **Step 1: Teste da seleção de migrações pendentes**

`erp/ferramentas/migracoes.test.mjs`:

```js
import { describe, it, expect } from "vitest";
import { pendentes } from "./migracoes.mjs";

describe("pendentes", () => {
  it("devolve só os arquivos não aplicados, em ordem", () => {
    const arquivos = ["0003_c.sql", "0001_a.sql", "0002_b.sql", "README.md"];
    expect(pendentes(["0001_a.sql"], arquivos)).toEqual(["0002_b.sql", "0003_c.sql"]);
  });
  it("rejeita nome fora do padrão NNNN_nome.sql", () => {
    expect(() => pendentes([], ["1_a.sql"])).toThrow(/padrao/);
  });
  it("rejeita número repetido", () => {
    expect(() => pendentes([], ["0001_a.sql", "0001_b.sql"])).toThrow(/repetid/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd erp && npx vitest run ferramentas/migracoes.test.mjs
```

Esperado: falha com "Failed to load" ou "Cannot find module" de `./migracoes.mjs`.

- [ ] **Step 3: Implementar `migracoes.mjs`**

```js
const PADRAO = /^(\d{4})_[a-z0-9_]+\.sql$/;

/** Arquivos .sql ainda não aplicados, ordenados pelo número. */
export function pendentes(aplicadas, arquivos) {
  const sql = arquivos.filter((a) => a.endsWith(".sql"));
  const numeros = new Set();
  for (const a of sql) {
    const m = PADRAO.exec(a);
    if (!m) throw new Error(`Migracao fora do padrao NNNN_nome.sql: ${a}`);
    if (numeros.has(m[1])) throw new Error(`Numero de migracao repetido: ${m[1]}`);
    numeros.add(m[1]);
  }
  const feitas = new Set(aplicadas);
  return sql.filter((a) => !feitas.has(a)).sort();
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd erp && npx vitest run ferramentas/migracoes.test.mjs
```

Esperado: 3 testes passando.

- [ ] **Step 5: Helpers de ambiente e API**

`erp/ferramentas/env.mjs`:

```js
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Carrega ../.env (tokens de conta e chaves do dev) e ./.env.local (runtime), nessa ordem. */
export function carregarEnv(raiz = process.cwd()) {
  for (const caminho of [resolve(raiz, "..", ".env"), resolve(raiz, ".env.local")]) {
    if (existsSync(caminho)) process.loadEnvFile(caminho);
  }
}

export function exigirEnv(nome) {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variavel ${nome} nao definida`);
  return valor;
}
```

`erp/ferramentas/supabase-api.mjs`:

```js
import { exigirEnv } from "./env.mjs";

const BASE = "https://api.supabase.com/v1";

async function chamar(metodo, caminho, corpo) {
  const resposta = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${exigirEnv("SUPABASE_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = texto;
  }
  if (!resposta.ok) {
    const msg = dados && typeof dados === "object" && "message" in dados ? dados.message : texto;
    throw new Error(`Management API ${metodo} ${caminho}: ${resposta.status} ${msg}`);
  }
  return dados;
}

/** Executa SQL no projeto. Lança erro com a mensagem do Postgres. */
export async function consultar(ref, sql) {
  const dados = await chamar("POST", `/projects/${ref}/database/query`, { query: sql });
  if (dados && typeof dados === "object" && !Array.isArray(dados) && "message" in dados) {
    throw new Error(dados.message);
  }
  return dados;
}

export const api = {
  get: (caminho) => chamar("GET", caminho),
  post: (caminho, corpo) => chamar("POST", caminho, corpo),
};
```

- [ ] **Step 6: Script de migração**

`erp/ferramentas/migrar.mjs`:

```js
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { carregarEnv, exigirEnv } from "./env.mjs";
import { consultar } from "./supabase-api.mjs";
import { pendentes } from "./migracoes.mjs";

carregarEnv();
const i = process.argv.indexOf("--alvo");
const alvo = i >= 0 ? process.argv[i + 1] : "dev";
if (!["dev", "teste"].includes(alvo)) throw new Error("Use --alvo dev ou --alvo teste");
const ref = exigirEnv(alvo === "dev" ? "SUPABASE_PROJECT_REF" : "SUPABASE_TESTE_PROJECT_REF");
const pasta = resolve(process.cwd(), "..", "supabase", "migrations");

await consultar(
  ref,
  `create table if not exists public.migracoes_aplicadas (nome text primary key, aplicada_em timestamptz not null default now());
   alter table public.migracoes_aplicadas enable row level security;`,
);
const aplicadas = (await consultar(ref, "select nome from public.migracoes_aplicadas order by nome")).map(
  (l) => l.nome,
);
const fila = pendentes(aplicadas, readdirSync(pasta));

if (fila.length === 0) {
  console.log(`[${alvo}] nada pendente (${aplicadas.length} aplicadas)`);
} else {
  for (const nome of fila) {
    const sql = readFileSync(resolve(pasta, nome), "utf8");
    console.log(`[${alvo}] aplicando ${nome}`);
    await consultar(
      ref,
      `begin;\n${sql}\ninsert into public.migracoes_aplicadas (nome) values ('${nome}');\ncommit;`,
    );
  }
  console.log(`[${alvo}] ${fila.length} migracao(oes) aplicada(s)`);
}
```

- [ ] **Step 7: Projeto de teste**

`erp/ferramentas/projeto-teste.mjs`:

```js
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { carregarEnv } from "./env.mjs";
import { api } from "./supabase-api.mjs";

carregarEnv();
const NOME = "fcs-os-teste";
const comando = process.argv[2] ?? "status";
const ENV_RAIZ = resolve(process.cwd(), "..", ".env");

async function encontrar() {
  const projetos = await api.get("/projects");
  return projetos.find((p) => p.name === NOME) ?? null;
}

async function esperarAtivo(ref) {
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const p = await api.get(`/projects/${ref}`);
    if (p.status === "ACTIVE_HEALTHY") return p;
    await new Promise((r) => setTimeout(r, 10_000));
  }
  throw new Error("Projeto nao ficou ativo em 10 minutos");
}

async function gravarChaves(ref) {
  const chaves = await api.get(`/projects/${ref}/api-keys?reveal=true`);
  const anon = chaves.find((c) => c.name === "anon")?.api_key;
  const servico = chaves.find((c) => c.name === "service_role")?.api_key;
  if (!anon || !servico) throw new Error("Chaves anon/service_role nao encontradas");
  const linhas = [
    "",
    "# --- Projeto de teste do ERP (gerado por erp/ferramentas/projeto-teste.mjs) ---",
    `SUPABASE_TESTE_PROJECT_REF=${ref}`,
    `SUPABASE_TESTE_URL=https://${ref}.supabase.co`,
    `SUPABASE_TESTE_ANON_KEY=${anon}`,
    `SUPABASE_TESTE_SERVICE_ROLE_KEY=${servico}`,
  ];
  appendFileSync(ENV_RAIZ, linhas.join("\n") + "\n");
  console.log("Chaves gravadas no .env da raiz (SUPABASE_TESTE_*)");
}

if (comando === "status") {
  const p = await encontrar();
  console.log(p ? `${p.name} | ${p.region} | ${p.status} | ${p.id}` : "projeto de teste nao existe");
} else if (comando === "criar") {
  if (await encontrar()) throw new Error("ja existe; use status, chaves ou restaurar");
  const orgs = await api.get("/organizations");
  const org = orgs.find((o) => o.name === "LABSFCS") ?? orgs[0];
  const senha = randomBytes(24).toString("base64url");
  const criado = await api.post("/projects", {
    name: NOME,
    organization_id: org.id,
    region: "sa-east-1",
    db_pass: senha,
  });
  appendFileSync(ENV_RAIZ, `\nSUPABASE_TESTE_DB_PASSWORD=${senha}\n`);
  console.log(`criado ${criado.id}, aguardando ficar ativo...`);
  await esperarAtivo(criado.id);
  await gravarChaves(criado.id);
} else if (comando === "restaurar") {
  const p = await encontrar();
  if (!p) throw new Error("projeto de teste nao existe");
  if (p.status === "ACTIVE_HEALTHY") {
    console.log("ja ativo");
  } else {
    await api.post(`/projects/${p.id}/restore`, {});
    await esperarAtivo(p.id);
    console.log("restaurado");
  }
} else if (comando === "chaves") {
  const p = await encontrar();
  if (!p) throw new Error("projeto de teste nao existe");
  await gravarChaves(p.id);
} else {
  throw new Error("comandos: status | criar | restaurar | chaves");
}
```

Rodar `node ferramentas/projeto-teste.mjs criar` dentro de `erp/`. Esperado: projeto criado em sa-east-1, chaves gravadas no `.env` da raiz. Se a API rejeitar por limite de projetos ativos, conferir no painel que `LABSFCS` e `fcs-os-antigo-eua` estão pausados.

- [ ] **Step 8: Primeira migração**

`supabase/migrations/0001_extensoes.sql`:

```sql
-- 0001: extensões, schema de apoio e funções utilitárias.
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists app;
grant usage on schema app to authenticated, service_role;

-- Minúsculas sem acento. Marcada imutável para poder indexar (padrão aceito com unaccent).
create or replace function app.normalizar(texto text) returns text
language sql immutable parallel safe strict
set search_path = extensions, pg_temp
as $$ select lower(extensions.unaccent(texto)); $$;

create or replace function app.carimbar_atualizacao() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;
```

`supabase/seed/README.md`:

```markdown
# Sementes

As sementes de configuração (canais, unidades, categorias) ficam dentro das próprias migrações, com `on conflict do nothing`, para que dev e teste nasçam iguais. Dados de demonstração não existem: todo número na tela vem de registro real ou aparece como "Sem dados".
```

- [ ] **Step 9: Gerador de tipos**

`erp/ferramentas/tipos.mjs`:

```js
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { carregarEnv, exigirEnv } from "./env.mjs";

carregarEnv();
const ref = exigirEnv("SUPABASE_PROJECT_REF");
const saida = execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["--yes", "supabase@latest", "gen", "types", "typescript", "--project-id", ref, "--schema", "public"],
  { env: process.env, encoding: "utf8", maxBuffer: 50 * 1024 * 1024, shell: process.platform === "win32" },
);
mkdirSync("src/tipos", { recursive: true });
writeFileSync("src/tipos/banco.ts", `// Gerado por npm run tipos. Nao editar a mao.\n${saida}`);
console.log("src/tipos/banco.ts atualizado");
```

- [ ] **Step 10: Aplicar no dev e no teste, gerar tipos**

```bash
cd erp && npm run migrar -- --alvo dev && npm run migrar -- --alvo teste && npm run tipos
```

Esperado: "aplicando 0001_extensoes.sql" nos dois alvos; `src/tipos/banco.ts` criado com `migracoes_aplicadas` em `Tables`.

- [ ] **Step 11: Commit**

```bash
git add erp/ferramentas supabase erp/src/tipos erp/package.json erp/package-lock.json
git commit -m "erp: ferramentas de migracao, projeto de teste e tipos"
```

---

### Task 3: Migração base: usuários, papéis, auditoria, alertas, tokens

**Files:**
- Create: `supabase/migrations/0002_base.sql`

**Interfaces:**
- Produces: tabelas `usuarios_app`, `auditoria`, `alertas`, `tokens_integracao`; funções `app.papel_atual()`, `app.eh_dono()`, `app.pode_escrever()`, `app.usuario_ativo()`, `app.origem_atual()`, `app.auditar()`.
- Contrato de origem: o cliente envia cabeçalho HTTP `x-origem: web|mcp|script|importacao`; sem cabeçalho (Management API) vale `script`.

- [ ] **Step 1: Escrever a migração**

```sql
-- 0002: usuários da aplicação, papéis, auditoria, alertas e tokens de integração.

create table public.usuarios_app (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 120),
  papel text not null check (papel in ('dono', 'operador', 'leitura')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger usuarios_app_atualizado before update on public.usuarios_app
  for each row execute function app.carimbar_atualizacao();

-- Papel do usuário logado. security definer evita recursão nas policies de usuarios_app.
create or replace function app.papel_atual() returns text
language sql stable security definer
set search_path = public, pg_temp
as $$ select papel from public.usuarios_app where id = auth.uid() and ativo; $$;
revoke execute on function app.papel_atual() from public, anon;
grant execute on function app.papel_atual() to authenticated, service_role;

create or replace function app.eh_dono() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select coalesce(app.papel_atual() = 'dono', false); $$;

create or replace function app.pode_escrever() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select coalesce(app.papel_atual() in ('dono', 'operador'), false); $$;

create or replace function app.usuario_ativo() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select app.papel_atual() is not null; $$;

revoke execute on function app.eh_dono(), app.pode_escrever(), app.usuario_ativo() from public, anon;
grant execute on function app.eh_dono(), app.pode_escrever(), app.usuario_ativo() to authenticated, service_role;

-- Origem da ação, lida do cabeçalho x-origem enviado pelo cliente. Sem cabeçalho = script.
create or replace function app.origem_atual() returns text
language plpgsql stable as $$
declare
  cabecalhos json;
  origem text;
begin
  begin
    cabecalhos := current_setting('request.headers', true)::json;
  exception when others then
    cabecalhos := null;
  end;
  if cabecalhos is null then return 'script'; end if;
  origem := cabecalhos ->> 'x-origem';
  if origem in ('web', 'mcp', 'script', 'importacao') then return origem; end if;
  return 'web';
end $$;

create table public.auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text not null,
  acao text not null check (acao in ('insert', 'update', 'delete')),
  antes jsonb,
  depois jsonb,
  usuario_id uuid,
  origem text not null,
  em timestamptz not null default now()
);
create index auditoria_registro on public.auditoria (tabela, registro_id, em desc);
create index auditoria_em on public.auditoria (em desc);
alter table public.auditoria enable row level security;
create policy auditoria_ler on public.auditoria for select to authenticated using (app.eh_dono());

-- Trigger genérico. security definer para gravar mesmo sem policy de insert para o usuário.
-- registro_id é text para servir tabelas com chave uuid e com chave texto (unidades).
create or replace function app.auditar() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  rid text;
  chave text := coalesce(tg_argv[0], 'id');
begin
  if tg_op = 'DELETE' then rid := (to_jsonb(old) ->> chave); else rid := (to_jsonb(new) ->> chave); end if;
  insert into public.auditoria (tabela, registro_id, acao, antes, depois, usuario_id, origem)
  values (
    tg_table_name, rid, lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end,
    auth.uid(), app.origem_atual()
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

alter table public.usuarios_app enable row level security;
create policy usuarios_ler on public.usuarios_app for select to authenticated using (app.usuario_ativo());
create policy usuarios_inserir on public.usuarios_app for insert to authenticated with check (app.eh_dono());
create policy usuarios_alterar on public.usuarios_app for update to authenticated using (app.eh_dono()) with check (app.eh_dono());
create trigger usuarios_app_auditoria after insert or update or delete on public.usuarios_app
  for each row execute function app.auditar();

create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  severidade text not null check (severidade in ('info', 'atencao', 'critico')),
  titulo text not null,
  descricao text,
  entidade_tipo text,
  entidade_id uuid,
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  silenciado_ate timestamptz
);
create unique index alertas_aberto_unico on public.alertas (tipo, entidade_tipo, entidade_id)
  nulls not distinct where resolvido_em is null;
alter table public.alertas enable row level security;
create policy alertas_ler on public.alertas for select to authenticated using (app.usuario_ativo());
create policy alertas_inserir on public.alertas for insert to authenticated with check (app.pode_escrever());
create policy alertas_alterar on public.alertas for update to authenticated using (app.pode_escrever()) with check (app.pode_escrever());

create table public.tokens_integracao (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 80),
  hash_token text not null unique,
  prefixo text not null,
  usuario_id uuid not null references public.usuarios_app (id),
  escopos text[] not null default '{}',
  expira_em timestamptz,
  ultimo_uso_em timestamptz,
  revogado_em timestamptz,
  criado_em timestamptz not null default now()
);
alter table public.tokens_integracao enable row level security;
create policy tokens_dono on public.tokens_integracao for all to authenticated
  using (app.eh_dono()) with check (app.eh_dono());
create trigger tokens_auditoria after insert or update or delete on public.tokens_integracao
  for each row execute function app.auditar();
```

- [ ] **Step 2: Aplicar nos dois alvos e regenerar tipos**

```bash
cd erp && npm run migrar -- --alvo dev && npm run migrar -- --alvo teste && npm run tipos
```

Esperado: sem erro; `src/tipos/banco.ts` com `usuarios_app`, `auditoria`, `alertas`, `tokens_integracao`.

- [ ] **Step 3: Conferir no banco (dev)**

Via `consultar` (script curto `node -e` ou arquivo JSON):

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
select proname from pg_proc where pronamespace = 'app'::regnamespace order by 1;
```

Esperado: todas as tabelas com `rowsecurity = true`; funções `auditar`, `carimbar_atualizacao`, `eh_dono`, `normalizar`, `origem_atual`, `papel_atual`, `pode_escrever`, `usuario_ativo`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_base.sql erp/src/tipos/banco.ts
git commit -m "banco: usuarios, papeis, auditoria, alertas e tokens"
```

---

### Task 4: Migração de configuração: canais, taxas com vigência, categorias, unidades, sementes

**Files:**
- Create: `supabase/migrations/0003_configuracao.sql`

**Interfaces:**
- Produces: tabelas `canais_venda`, `canais_venda_taxas`, `categorias`, `unidades`; view `canais_venda_vigentes` (um canal por linha com as taxas vigentes ou nulas).

- [ ] **Step 1: Escrever a migração**

```sql
-- 0003: canais de venda com taxas por vigência, categorias por escopo, unidades e sementes.

create table public.canais_venda (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(nome) between 1 and 80),
  tipo text not null check (tipo in ('shopee', 'mercado_livre', 'tiktok_shop', 'site', 'direto', 'outro')),
  ativo boolean not null default true,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger canais_venda_atualizado before update on public.canais_venda
  for each row execute function app.carimbar_atualizacao();
create trigger canais_venda_auditoria after insert or update or delete on public.canais_venda
  for each row execute function app.auditar();

-- Cada linha é uma vigência. Valores nulos = não configurado (nunca inventar taxa).
create table public.canais_venda_taxas (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid not null references public.canais_venda (id) on delete cascade,
  vigente_desde date not null,
  comissao_pct numeric(7,6) check (comissao_pct >= 0 and comissao_pct < 1),
  taxa_fixa_item numeric(14,2) check (taxa_fixa_item >= 0),
  taxa_pagamento_pct numeric(7,6) check (taxa_pagamento_pct >= 0 and taxa_pagamento_pct < 1),
  ads_pct_padrao numeric(7,6) check (ads_pct_padrao >= 0 and ads_pct_padrao < 1),
  frete_subsidio_padrao numeric(14,2) check (frete_subsidio_padrao >= 0),
  dias_repasse integer check (dias_repasse >= 0),
  observacoes text,
  criado_em timestamptz not null default now(),
  unique (canal_id, vigente_desde)
);
create trigger canais_venda_taxas_auditoria after insert or update or delete on public.canais_venda_taxas
  for each row execute function app.auditar();

create view public.canais_venda_vigentes with (security_invoker = true) as
select distinct on (c.id)
  c.id, c.nome, c.tipo, c.ativo, c.observacoes, c.criado_em, c.atualizado_em,
  t.id as taxas_id, t.vigente_desde, t.comissao_pct, t.taxa_fixa_item, t.taxa_pagamento_pct,
  t.ads_pct_padrao, t.frete_subsidio_padrao, t.dias_repasse
from public.canais_venda c
left join public.canais_venda_taxas t on t.canal_id = c.id and t.vigente_desde <= current_date
order by c.id, t.vigente_desde desc;

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  escopo text not null check (escopo in ('produto', 'insumo', 'financeiro', 'conhecimento', 'planejamento')),
  nome text not null check (char_length(nome) between 1 and 80),
  pai_id uuid references public.categorias (id),
  cor text check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (escopo, nome)
);
create trigger categorias_atualizado before update on public.categorias
  for each row execute function app.carimbar_atualizacao();
create trigger categorias_auditoria after insert or update or delete on public.categorias
  for each row execute function app.auditar();

create table public.unidades (
  codigo text primary key check (codigo ~ '^[a-z]{1,6}$'),
  nome text not null check (char_length(nome) between 1 and 40),
  base text references public.unidades (codigo),
  fator_para_base numeric(14,6) not null default 1 check (fator_para_base > 0)
);
create trigger unidades_auditoria after insert or update or delete on public.unidades
  for each row execute function app.auditar('codigo');

alter table public.canais_venda enable row level security;
alter table public.canais_venda_taxas enable row level security;
alter table public.categorias enable row level security;
alter table public.unidades enable row level security;

create policy canais_ler on public.canais_venda for select to authenticated using (app.usuario_ativo());
create policy canais_escrever on public.canais_venda for all to authenticated using (app.eh_dono()) with check (app.eh_dono());
create policy taxas_ler on public.canais_venda_taxas for select to authenticated using (app.usuario_ativo());
create policy taxas_escrever on public.canais_venda_taxas for all to authenticated using (app.eh_dono()) with check (app.eh_dono());
create policy categorias_ler on public.categorias for select to authenticated using (app.usuario_ativo());
create policy categorias_escrever on public.categorias for all to authenticated using (app.pode_escrever()) with check (app.pode_escrever());
create policy unidades_ler on public.unidades for select to authenticated using (app.usuario_ativo());
create policy unidades_escrever on public.unidades for all to authenticated using (app.eh_dono()) with check (app.eh_dono());

-- Sementes (idempotentes). Taxas ficam em branco de propósito.
insert into public.canais_venda (nome, tipo) values
  ('Shopee', 'shopee'), ('Mercado Livre', 'mercado_livre'), ('TikTok Shop', 'tiktok_shop'), ('Venda direta', 'direto')
on conflict (nome) do nothing;

insert into public.unidades (codigo, nome, base, fator_para_base) values
  ('g', 'grama', null, 1), ('kg', 'quilograma', 'g', 1000),
  ('un', 'unidade', null, 1),
  ('mm', 'milímetro', null, 1), ('cm', 'centímetro', 'mm', 10), ('m', 'metro', 'mm', 1000),
  ('ml', 'mililitro', null, 1), ('l', 'litro', 'ml', 1000),
  ('min', 'minuto', null, 1), ('h', 'hora', 'min', 60)
on conflict (codigo) do nothing;

insert into public.categorias (escopo, nome, ordem) values
  ('produto', 'Games', 1), ('produto', 'Miniaturas', 2), ('produto', 'Fórmula 1', 3), ('produto', 'Carros', 4), ('produto', 'Outros', 9),
  ('financeiro', 'Vendas em marketplace', 1), ('financeiro', 'Vendas diretas', 2),
  ('financeiro', 'Filamento e insumos', 10), ('financeiro', 'Energia', 11), ('financeiro', 'Taxas de marketplace', 12),
  ('financeiro', 'Embalagem e expedição', 13), ('financeiro', 'Manutenção de impressoras', 14), ('financeiro', 'Impostos', 15),
  ('financeiro', 'Software e assinaturas', 16), ('financeiro', 'Outras despesas', 19),
  ('conhecimento', 'Impressão 3D', 1), ('conhecimento', 'Materiais e filamentos', 2), ('conhecimento', 'Perfis de impressão', 3),
  ('conhecimento', 'Soluções para falhas', 4), ('conhecimento', 'Custos e formação de preço', 5), ('conhecimento', 'Processos internos', 6),
  ('conhecimento', 'Marketing e vendas', 7), ('conhecimento', 'Desenvolvimento de software', 8), ('conhecimento', 'Decisões de negócio', 9),
  ('conhecimento', 'Procedimentos operacionais', 10), ('conhecimento', 'Fornecedores', 11),
  ('planejamento', 'Conteúdo', 1), ('planejamento', 'Operação', 2), ('planejamento', 'Produto', 3), ('planejamento', 'Marketing', 4)
on conflict (escopo, nome) do nothing;
```

- [ ] **Step 2: Aplicar e regenerar tipos**

```bash
cd erp && npm run migrar -- --alvo dev && npm run migrar -- --alvo teste && npm run tipos
```

Esperado: `select count(*) from canais_venda` = 4, `unidades` = 10, `categorias` = 30 nos dois alvos; `banco.ts` com `canais_venda_vigentes` em `Views`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_configuracao.sql erp/src/tipos/banco.ts
git commit -m "banco: canais, taxas por vigencia, categorias, unidades e sementes"
```

---

### Task 5: Migração da busca global

**Files:**
- Create: `supabase/migrations/0004_busca.sql`

**Interfaces:**
- Produces: `public.buscar_global(termo text, tipos text[] default null, limite integer default 8)` devolvendo `(tipo, id, titulo, subtitulo, rota, pontuacao)`. Tipos nesta fase: `canal`, `categoria`, `unidade`. Fases seguintes substituem a função acrescentando ramos (`create or replace`).

- [ ] **Step 1: Escrever a migração**

```sql
-- 0004: busca global por trigram sobre nomes normalizados. security invoker: RLS vale por tabela.

create index canais_venda_busca on public.canais_venda using gin (app.normalizar(nome) extensions.gin_trgm_ops);
create index categorias_busca on public.categorias using gin (app.normalizar(nome) extensions.gin_trgm_ops);
create index unidades_busca on public.unidades using gin (app.normalizar(nome) extensions.gin_trgm_ops);

create or replace function public.buscar_global(termo text, tipos text[] default null, limite integer default 8)
returns table (tipo text, id text, titulo text, subtitulo text, rota text, pontuacao real)
language sql stable security invoker
set search_path = public, extensions, pg_temp
as $$
with q as (select app.normalizar(coalesce(termo, '')) as t)
select * from (
  (select 'canal'::text, c.id::text, c.nome, c.tipo, '/configuracoes/canais/' || c.id,
          greatest(similarity(app.normalizar(c.nome), q.t),
                   case when app.normalizar(c.nome) like '%' || q.t || '%' then 0.9 else 0 end)::real
     from public.canais_venda c, q
    where (tipos is null or 'canal' = any (tipos)) and char_length(q.t) >= 2
      and (app.normalizar(c.nome) % q.t or app.normalizar(c.nome) like '%' || q.t || '%')
    order by 6 desc limit limite)
  union all
  (select 'categoria', k.id::text, k.nome, k.escopo, '/configuracoes/categorias?escopo=' || k.escopo || '&destaque=' || k.id,
          greatest(similarity(app.normalizar(k.nome), q.t),
                   case when app.normalizar(k.nome) like '%' || q.t || '%' then 0.9 else 0 end)::real
     from public.categorias k, q
    where (tipos is null or 'categoria' = any (tipos)) and char_length(q.t) >= 2
      and (app.normalizar(k.nome) % q.t or app.normalizar(k.nome) like '%' || q.t || '%')
    order by 6 desc limit limite)
  union all
  (select 'unidade', u.codigo, u.nome, u.codigo, '/configuracoes/unidades?destaque=' || u.codigo,
          greatest(similarity(app.normalizar(u.nome), q.t),
                   case when app.normalizar(u.nome) like '%' || q.t || '%' or u.codigo = q.t then 0.9 else 0 end)::real
     from public.unidades u, q
    where (tipos is null or 'unidade' = any (tipos)) and char_length(q.t) >= 1
      and (app.normalizar(u.nome) % q.t or app.normalizar(u.nome) like '%' || q.t || '%' or u.codigo = q.t)
    order by 6 desc limit limite)
) r
order by pontuacao desc, tipo, titulo;
$$;
revoke execute on function public.buscar_global(text, text[], integer) from public, anon;
grant execute on function public.buscar_global(text, text[], integer) to authenticated, service_role;
```

- [ ] **Step 2: Aplicar, regenerar tipos e testar manualmente**

```bash
cd erp && npm run migrar -- --alvo dev && npm run migrar -- --alvo teste && npm run tipos
```

Via `consultar` no dev: `select * from buscar_global('formula');` Esperado: linha `categoria | Fórmula 1`. `select * from buscar_global('kg', array['unidade']);` Esperado: `unidade | quilograma`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0004_busca.sql erp/src/tipos/banco.ts
git commit -m "banco: funcao buscar_global com ramos de configuracao"
```

---

### Task 6: Clientes Supabase, variáveis, proxy de sessão, papéis e sessão

**Files:**
- Create: `erp/src/lib/env.ts`, `erp/src/lib/supabase/servidor.ts`, `erp/src/lib/supabase/admin.ts`, `erp/src/lib/supabase/proxy.ts`, `erp/src/proxy.ts`, `erp/src/lib/auth/papeis.ts`, `erp/src/lib/auth/papeis.test.ts`, `erp/src/lib/auth/sessao.ts`, `erp/.env.local` (não versionado, copiado do `.env` da raiz)

**Interfaces:**
- Produces: `env(nome)`, `clienteServidor()`, `clienteAdmin(origem)`, `atualizarSessao(request)`, `PAPEIS`, `AREAS`, `lerPapel`, `podeLer`, `podeEscrever`, `areaDaRota`, `usuarioAtual()`, `exigirLeitura(area)`, `exigirEscrita(area)`, tipo `UsuarioSessao = { id; email; nome; papel }`.

- [ ] **Step 1: Teste dos papéis**

`erp/src/lib/auth/papeis.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { areaDaRota, lerPapel, podeEscrever, podeLer } from "./papeis";

describe("papeis", () => {
  it("dono lê e escreve em tudo", () => {
    expect(podeLer("dono", "financeiro")).toBe(true);
    expect(podeEscrever("dono", "usuarios")).toBe(true);
  });
  it("operador não vê financeiro nem usuários, escreve em operação", () => {
    expect(podeLer("operador", "financeiro")).toBe(false);
    expect(podeLer("operador", "usuarios")).toBe(false);
    expect(podeEscrever("operador", "estoque")).toBe(true);
    expect(podeEscrever("operador", "configuracoes")).toBe(false);
  });
  it("leitura só lê", () => {
    expect(podeLer("leitura", "estoque")).toBe(true);
    expect(podeEscrever("leitura", "estoque")).toBe(false);
  });
  it("sem papel não acessa nada", () => {
    expect(podeLer(null, "inicio")).toBe(false);
    expect(lerPapel("admin")).toBeNull();
    expect(lerPapel("dono")).toBe("dono");
  });
  it("mapeia rota para área", () => {
    expect(areaDaRota("/")).toBe("inicio");
    expect(areaDaRota("/configuracoes/canais/abc")).toBe("configuracoes");
    expect(areaDaRota("/configuracoes/usuarios")).toBe("usuarios");
    expect(areaDaRota("/perfil")).toBeNull();
    expect(areaDaRota("/estoque/")).toBe("estoque");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd erp && npx vitest run src/lib/auth/papeis.test.ts
```

Esperado: falha por módulo inexistente.

- [ ] **Step 3: Implementar `papeis.ts`**

```ts
export const PAPEIS = ["dono", "operador", "leitura"] as const;
export type Papel = (typeof PAPEIS)[number];
export const PAPEL_ROTULO: Record<Papel, string> = { dono: "Dono", operador: "Operador", leitura: "Leitura" };

export const AREAS = [
  "inicio", "conhecimento", "estoque", "catalogo", "producao", "vendas", "financeiro",
  "planejamento", "relatorios", "alertas", "configuracoes", "usuarios",
] as const;
export type Area = (typeof AREAS)[number];

const SEM_FINANCEIRO: readonly Area[] = AREAS.filter((a) => a !== "financeiro" && a !== "usuarios");

const LEITURA: Record<Papel, readonly Area[]> = { dono: AREAS, operador: SEM_FINANCEIRO, leitura: SEM_FINANCEIRO };
const ESCRITA: Record<Papel, readonly Area[]> = {
  dono: AREAS,
  operador: ["conhecimento", "estoque", "catalogo", "producao", "vendas", "planejamento", "alertas"],
  leitura: [],
};

export function lerPapel(valor: unknown): Papel | null {
  return PAPEIS.includes(valor as Papel) ? (valor as Papel) : null;
}

export function podeLer(papel: Papel | null, area: Area): boolean {
  return papel !== null && LEITURA[papel].includes(area);
}

export function podeEscrever(papel: Papel | null, area: Area): boolean {
  return papel !== null && ESCRITA[papel].includes(area);
}

/** Área de uma rota. null = rota livre para qualquer logado (perfil, sem-acesso). */
export function areaDaRota(pathname: string): Area | null {
  const limpo = pathname.replace(/\/+$/, "") || "/";
  if (limpo === "/") return "inicio";
  if (limpo.startsWith("/configuracoes/usuarios")) return "usuarios";
  const primeiro = limpo.split("/")[1];
  return AREAS.includes(primeiro as Area) ? (primeiro as Area) : null;
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd erp && npx vitest run src/lib/auth/papeis.test.ts
```

Esperado: 5 testes passando.

- [ ] **Step 5: Variáveis e clientes**

`erp/src/lib/env.ts`:

```ts
import "server-only";

type Nome = "SUPABASE_URL" | "SUPABASE_ANON_KEY" | "SUPABASE_SERVICE_ROLE_KEY";

/** Leitura preguiçosa: falha só quando a variável é usada, nunca no build. */
export function env(nome: Nome): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida (erp/.env.local)`);
  return valor;
}
```

`erp/src/lib/supabase/servidor.ts`:

```ts
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/tipos/banco";
import { env } from "@/lib/env";

/** Cliente com a sessão do usuário (cookies). RLS vale. Server components e actions. */
export async function clienteServidor() {
  const jar = await cookies();
  return createServerClient<Database>(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) jar.set(name, value, options);
        } catch {
          // Server component não escreve cookie; o proxy renova a sessão.
        }
      },
    },
    global: { headers: { "x-origem": "web" } },
  });
}
```

`erp/src/lib/supabase/admin.ts`:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/tipos/banco";
import { env } from "@/lib/env";

export type Origem = "web" | "mcp" | "script" | "importacao";

/** Service role: ignora RLS. Só para criar usuários (dono) e scripts. Nunca em componente. */
export function clienteAdmin(origem: Origem = "web") {
  return createClient<Database>(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-origem": origem } },
  });
}
```

`erp/src/lib/supabase/proxy.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const LOGIN = "/login";
const LIVRES = ["/login", "/sem-acesso"];

/** Renova o cookie de sessão e manda deslogado para /login. Permissão por área fica nas páginas. */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        for (const { name, value } of lista) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of lista) response.cookies.set(name, value, options);
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const caminho = request.nextUrl.pathname;
  const livre = LIVRES.some((p) => caminho === p || caminho.startsWith(`${p}/`));

  if (!user && !livre) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN;
    url.search = caminho === "/" ? "" : `?voltar=${encodeURIComponent(caminho)}`;
    return NextResponse.redirect(url);
  }
  if (user && caminho === LOGIN) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
```

`erp/src/proxy.ts`:

```ts
import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  // /api/* autentica por token próprio (Fase 2); internals e arquivos ficam fora.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 6: Sessão**

`erp/src/lib/auth/sessao.ts`:

```ts
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import { lerPapel, podeEscrever, podeLer, type Area, type Papel } from "@/lib/auth/papeis";

export type UsuarioSessao = { id: string; email: string; nome: string; papel: Papel };

/** Usuário logado com linha ativa em usuarios_app. Cacheado por request. */
export const usuarioAtual = cache(async (): Promise<UsuarioSessao | null> => {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("usuarios_app")
    .select("id, nome, papel, ativo")
    .eq("id", user.id)
    .maybeSingle();
  const papel = lerPapel(data?.papel);
  if (!data || !data.ativo || !papel) return null;
  return { id: data.id, email: user.email ?? "", nome: data.nome, papel };
});

/** Páginas: redireciona quem não pode ler a área. */
export async function exigirLeitura(area: Area): Promise<UsuarioSessao> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/sem-acesso");
  if (!podeLer(usuario.papel, area)) redirect(`/sem-acesso?area=${area}`);
  return usuario;
}

/** Actions: lança erro se não pode escrever (uma action pode ser disparada de qualquer página). */
export async function exigirEscrita(area: Area): Promise<UsuarioSessao> {
  const usuario = await usuarioAtual();
  if (!usuario || !podeEscrever(usuario.papel, area)) throw new Error("sem_permissao");
  return usuario;
}
```

- [ ] **Step 7: Ambiente local e verificação**

Criar `erp/.env.local` com `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` copiados do `.env` da raiz (mesmos valores do projeto `fcs-os`). Rodar:

```bash
cd erp && npm run typecheck && npm run lint && npm test
```

Esperado: tudo verde (os testes de `migracoes` e `papeis`).

- [ ] **Step 8: Commit**

```bash
git add erp/src
git commit -m "erp: clientes Supabase, proxy de sessao, papeis e sessao"
```

---

### Task 7: Design system: shadcn, tokens, fontes, tema, formatos

**Files:**
- Create: `erp/components.json` (via init), `erp/src/componentes/ui/*` (via add), `erp/src/lib/utils.ts` (via init), `erp/src/lib/fontes.ts`, `erp/src/lib/tema.ts`, `erp/src/lib/tema.test.ts`, `erp/src/lib/formatos/numero.ts`, `numero.test.ts`, `moeda.ts`, `moeda.test.ts`, `data.ts`, `data.test.ts`, `erp/src/componentes/painel/Icone.tsx`, `erp/public/logo.png`
- Modify: `erp/src/app/globals.css`, `erp/src/app/layout.tsx`

**Interfaces:**
- Produces: componentes shadcn em `@/componentes/ui/*`; `cn()` em `@/lib/utils`; fontes `inter`, `chakra`, `mono`; `lerTema`, `COOKIE_TEMA`, tipo `Tema`; `lerNumeroPt`, `percentualParaFracao`, `formatarNumero`, `formatarMoeda`, `formatarPercentual`, `formatarData`, `hojeSaoPaulo`; `Icone` por nome.
- Classes Tailwind disponíveis: `bg-fundo`, `bg-superficie`, `bg-superficie-2`, `border-borda`, `text-texto`, `text-texto-2`, `text-texto-3`, `text-acao`, `bg-acao`, `text-acao-texto`, `bg-acao-suave`, `text-sucesso`, `text-alerta`, `text-erro`, `font-titulo`, `font-mono`, mais as padrão do shadcn (`bg-background`, `text-muted-foreground` etc., mapeadas para os mesmos tokens).

- [ ] **Step 1: shadcn init e componentes**

```bash
cd erp && npx --yes shadcn@latest init -y -b radix --css-variables
```

Se perguntar cor base, escolher `neutral`. Depois editar `erp/components.json` para os aliases do projeto:

```json
"aliases": {
  "components": "@/componentes",
  "utils": "@/lib/utils",
  "ui": "@/componentes/ui",
  "lib": "@/lib",
  "hooks": "@/hooks"
}
```

Conferir que `tailwind.css` aponta para `src/app/globals.css`. Se o init tiver criado `src/components/`, mover o conteúdo para `src/componentes/` e apagar a pasta antiga. Então:

```bash
npx --yes shadcn@latest add -y button input label select dialog sheet dropdown-menu tabs table badge tooltip sonner command popover separator skeleton switch textarea checkbox scroll-area avatar sidebar breadcrumb card
```

Esperado: arquivos em `src/componentes/ui/`, dependências Radix instaladas, `src/lib/utils.ts` com `cn`. Rodar `npm run typecheck`.

- [ ] **Step 2: Fontes, tema e logo**

`erp/src/lib/fontes.ts`:

```ts
import { Chakra_Petch, Inter, JetBrains_Mono } from "next/font/google";

export const inter = Inter({ subsets: ["latin"], variable: "--fonte-corpo", display: "swap" });
export const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--fonte-titulo",
  display: "swap",
});
export const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--fonte-mono", display: "swap" });
```

`erp/src/lib/tema.ts`:

```ts
export const TEMAS = ["escuro", "claro"] as const;
export type Tema = (typeof TEMAS)[number];
export const COOKIE_TEMA = "fcs-tema";

export function lerTema(valor: string | undefined | null): Tema {
  return valor === "claro" ? "claro" : "escuro";
}
```

`erp/src/lib/tema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { lerTema } from "./tema";

describe("lerTema", () => {
  it("escuro é o padrão", () => {
    expect(lerTema(undefined)).toBe("escuro");
    expect(lerTema("qualquer")).toBe("escuro");
    expect(lerTema("claro")).toBe("claro");
  });
});
```

Copiar o logo: `cp identidade/logo.png erp/public/logo.png` (na raiz do repositório).

- [ ] **Step 3: Tokens em `globals.css`**

Substituir todo o `erp/src/app/globals.css` por (manter a linha `@import "tw-animate-css";` se o init a tiver adicionado):

```css
@import "tailwindcss";
@import "tw-animate-css";

/* Tema claro por atributo no <html>; escuro é o :root. */
@custom-variant claro (&:where([data-tema="claro"], [data-tema="claro"] *));

/* Tokens da marca FCS (spec seção 8.2). */
:root {
  color-scheme: dark;
  --fundo: #0a0a0a;
  --superficie: #121314;
  --superficie-2: #191a1c;
  --borda: #242628;
  --texto: #f2f3f4;
  --texto-2: #a4a8ad;
  --texto-3: #6e7378;
  --acao: #00d8ff;
  --acao-texto: #0a0a0a;
  --acao-suave: #0b2a31;
  --sucesso: #3ddc97;
  --alerta: #f5b841;
  --erro: #f26d6d;
  --info: #00d8ff;
  --raio: 4px;

  /* Nomes que o shadcn usa, apontando para os tokens acima. */
  --background: var(--fundo);
  --foreground: var(--texto);
  --card: var(--superficie);
  --card-foreground: var(--texto);
  --popover: var(--superficie);
  --popover-foreground: var(--texto);
  --primary: var(--acao);
  --primary-foreground: var(--acao-texto);
  --secondary: var(--superficie-2);
  --secondary-foreground: var(--texto);
  --muted: var(--superficie-2);
  --muted-foreground: var(--texto-2);
  --accent: var(--acao-suave);
  --accent-foreground: var(--texto);
  --destructive: var(--erro);
  --destructive-foreground: #0a0a0a;
  --border: var(--borda);
  --input: var(--borda);
  --ring: var(--acao);
  --radius: var(--raio);
  --chart-1: var(--acao);
  --chart-2: var(--sucesso);
  --chart-3: var(--alerta);
  --chart-4: var(--erro);
  --chart-5: var(--texto-2);
  --sidebar: var(--superficie);
  --sidebar-foreground: var(--texto);
  --sidebar-primary: var(--acao);
  --sidebar-primary-foreground: var(--acao-texto);
  --sidebar-accent: var(--acao-suave);
  --sidebar-accent-foreground: var(--texto);
  --sidebar-border: var(--borda);
  --sidebar-ring: var(--acao);
}

[data-tema="claro"] {
  color-scheme: light;
  --fundo: #f6f7f8;
  --superficie: #ffffff;
  --superficie-2: #f0f2f4;
  --borda: #e3e6e9;
  --texto: #111315;
  --texto-2: #5b6168;
  --texto-3: #8a9097;
  --acao: #0098b8;
  --acao-texto: #ffffff;
  --acao-suave: #dff7fc;
  --sucesso: #1e8e5a;
  --alerta: #9a6b00;
  --erro: #b3261e;
  --info: #0098b8;
  --destructive-foreground: #ffffff;
}

@theme inline {
  --color-fundo: var(--fundo);
  --color-superficie: var(--superficie);
  --color-superficie-2: var(--superficie-2);
  --color-borda: var(--borda);
  --color-texto: var(--texto);
  --color-texto-2: var(--texto-2);
  --color-texto-3: var(--texto-3);
  --color-acao: var(--acao);
  --color-acao-texto: var(--acao-texto);
  --color-acao-suave: var(--acao-suave);
  --color-sucesso: var(--sucesso);
  --color-alerta: var(--alerta);
  --color-erro: var(--erro);
  --color-info: var(--info);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--fonte-corpo), system-ui, sans-serif;
  --font-titulo: var(--fonte-titulo), var(--fonte-corpo), sans-serif;
  --font-mono: var(--fonte-mono), ui-monospace, monospace;

  --radius-sm: 2px;
  --radius-md: var(--raio);
  --radius-lg: 6px;
  --radius-xl: 8px;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
  h1,
  h2 {
    font-family: var(--font-titulo);
  }
  .numeros {
    font-variant-numeric: tabular-nums;
  }
  :focus-visible {
    outline: 2px solid var(--acao);
    outline-offset: 2px;
  }
}
```

Se o `init` tiver gerado um bloco `.dark { ... }`, apagá-lo: o escuro é o `:root`. Se `tw-animate-css` não estiver instalado, remover o import ou rodar `npm install -D tw-animate-css`.

- [ ] **Step 4: Layout raiz**

`erp/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { chakra, inter, mono } from "@/lib/fontes";
import { COOKIE_TEMA, lerTema } from "@/lib/tema";
import { Toaster } from "@/componentes/ui/sonner";

export const metadata: Metadata = {
  title: { default: "FCS ERP", template: "%s | FCS ERP" },
  robots: { index: false, follow: false },
};

export default async function LayoutRaiz({ children }: { children: React.ReactNode }) {
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value);
  return (
    <html
      lang="pt-BR"
      data-tema={tema}
      className={`${inter.variable} ${chakra.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-fundo text-texto">
        {children}
        <Toaster position="bottom-right" richColors={false} />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Testes dos formatos**

`erp/src/lib/formatos/numero.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatarNumero, lerNumeroPt, percentualParaFracao } from "./numero";

describe("numero", () => {
  it("lê número no formato brasileiro e no americano", () => {
    expect(lerNumeroPt("1.234,56")).toBe(1234.56);
    expect(lerNumeroPt("14,5")).toBe(14.5);
    expect(lerNumeroPt("1234.56")).toBe(1234.56);
    expect(lerNumeroPt("4")).toBe(4);
    expect(lerNumeroPt("")).toBeNull();
    expect(lerNumeroPt("abc")).toBeNull();
    expect(lerNumeroPt("-1")).toBe(-1);
  });
  it("converte percentual digitado em fração com 6 casas", () => {
    expect(percentualParaFracao("14,5")).toBe(0.145);
    expect(percentualParaFracao("20")).toBe(0.2);
    expect(percentualParaFracao("0,0001")).toBe(0.000001);
    expect(percentualParaFracao("")).toBeNull();
  });
  it("formata com separadores brasileiros", () => {
    expect(formatarNumero(1234.5, 2)).toBe("1.234,50");
    expect(formatarNumero(null)).toBe("Sem dados");
  });
});
```

`erp/src/lib/formatos/moeda.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatarMoeda, formatarPercentual } from "./moeda";

const semEspacoFixo = (s: string) => s.replace(/ /g, " ");

describe("moeda", () => {
  it("formata reais", () => {
    expect(semEspacoFixo(formatarMoeda(1234.5))).toBe("R$ 1.234,50");
    expect(semEspacoFixo(formatarMoeda("0.06", 4))).toBe("R$ 0,0600");
    expect(formatarMoeda(null)).toBe("Sem dados");
  });
  it("formata fração como percentual com 1 casa", () => {
    expect(semEspacoFixo(formatarPercentual(0.145))).toBe("14,5 %");
    expect(formatarPercentual(null)).toBe("Não configurado");
  });
});
```

`erp/src/lib/formatos/data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatarData, formatarDataHora } from "./data";

describe("data", () => {
  it("mostra datas em horário de São Paulo", () => {
    expect(formatarData("2026-10-11")).toBe("11/10/2026");
    expect(formatarDataHora("2026-10-12T01:30:00Z")).toBe("11/10/2026 22:30");
    expect(formatarData(null)).toBe("");
  });
});
```

- [ ] **Step 6: Rodar e ver falhar, implementar**

```bash
cd erp && npx vitest run src/lib/formatos
```

Esperado: 3 arquivos falhando por módulo inexistente. Implementar:

`erp/src/lib/formatos/numero.ts`:

```ts
/** "1.234,56" ou "1234.56" para número. Vazio ou inválido vira null. */
export function lerNumeroPt(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  const limpo = texto.trim();
  if (!limpo) return null;
  const normalizado = /,\d{1,6}$/.test(limpo) || (limpo.includes(",") && !limpo.includes("."))
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo.replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return null;
  return Number(normalizado);
}

/** "14,5" (por cento) para 0.145, com 6 casas. */
export function percentualParaFracao(texto: string | null | undefined): number | null {
  const n = lerNumeroPt(texto);
  if (n === null) return null;
  return Math.round((n / 100) * 1_000_000) / 1_000_000;
}

const formatadores = new Map<number, Intl.NumberFormat>();

export function formatarNumero(valor: number | string | null | undefined, casas = 2): string {
  if (valor == null || valor === "") return "Sem dados";
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (!Number.isFinite(n)) return "Sem dados";
  let f = formatadores.get(casas);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
    formatadores.set(casas, f);
  }
  return f.format(n);
}
```

`erp/src/lib/formatos/moeda.ts`:

```ts
import { formatarNumero } from "./numero";

export function formatarMoeda(valor: number | string | null | undefined, casas = 2): string {
  if (valor == null || valor === "") return "Sem dados";
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (!Number.isFinite(n)) return "Sem dados";
  return `R$ ${formatarNumero(n, casas)}`;
}

/** Fração (0.145) para "14,5 %". */
export function formatarPercentual(fracao: number | string | null | undefined, casas = 1): string {
  if (fracao == null || fracao === "") return "Não configurado";
  const n = typeof fracao === "string" ? Number(fracao) : fracao;
  if (!Number.isFinite(n)) return "Não configurado";
  return `${formatarNumero(n * 100, casas)} %`;
}
```

`erp/src/lib/formatos/data.ts`:

```ts
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";

export const FUSO = "America/Sao_Paulo";

function paraTz(valor: string | Date): TZDate {
  if (valor instanceof Date) return new TZDate(valor, FUSO);
  // Data pura (aaaa-mm-dd) é interpretada no fuso local de São Paulo, não em UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-").map(Number);
    return new TZDate(a, m - 1, d, FUSO);
  }
  return new TZDate(valor, FUSO);
}

export function formatarData(valor: string | Date | null | undefined): string {
  if (!valor) return "";
  return format(paraTz(valor), "dd/MM/yyyy");
}

export function formatarDataHora(valor: string | Date | null | undefined): string {
  if (!valor) return "";
  return format(paraTz(valor), "dd/MM/yyyy HH:mm");
}

/** Data de hoje em São Paulo no formato aaaa-mm-dd (para inputs type=date). */
export function hojeSaoPaulo(): string {
  return format(new TZDate(new Date(), FUSO), "yyyy-MM-dd");
}
```

```bash
cd erp && npx vitest run src/lib
```

Esperado: todos passando (tema, papeis, numero, moeda, data).

- [ ] **Step 7: Ícones por nome**

`erp/src/componentes/painel/Icone.tsx`:

```tsx
import {
  Bell, BookOpen, Boxes, Calculator, Calendar, Columns3, Factory, FileSearch, Gauge, Home,
  KeyRound, Layers, Package, Printer, Receipt, Ruler, Settings, ShoppingCart, Store, Tags,
  Truck, Users, Wallet, ArrowLeftRight, type LucideProps,
} from "lucide-react";

export const ICONES = {
  inicio: Home, conhecimento: BookOpen, estoque: Boxes, movimentacoes: ArrowLeftRight, compras: ShoppingCart,
  fornecedores: Truck, produtos: Package, calculadora: Calculator, producao: Factory, impressoras: Printer,
  pedidos: Receipt, clientes: Users, financeiro: Wallet, lancamentos: Layers, planejamento: Calendar,
  quadro: Columns3, relatorios: Gauge, alertas: Bell, configuracoes: Settings, canais: Store,
  categorias: Tags, unidades: Ruler, usuarios: Users, integracoes: KeyRound, auditoria: FileSearch,
} as const;

export type NomeIcone = keyof typeof ICONES;

export function Icone({ nome, ...props }: { nome: NomeIcone } & LucideProps) {
  const Componente = ICONES[nome];
  return <Componente aria-hidden="true" {...props} />;
}
```

- [ ] **Step 8: Build e commit**

```bash
cd erp && npm run lint && npm run typecheck && npm run build
git add erp
git commit -m "erp: design system com tokens da marca, shadcn, fontes e formatos"
```

---

### Task 8: Login, saída, sem acesso e criação de usuário

**Files:**
- Create: `erp/src/lib/forms.ts`, `erp/src/lib/forms.test.ts`, `erp/src/lib/erros-pt.ts`, `erp/src/componentes/painel/CampoErro.tsx`, `erp/src/app/(auth)/layout.tsx`, `erp/src/app/(auth)/login/page.tsx`, `erp/src/app/(auth)/login/acoes.ts`, `erp/src/app/(auth)/login/FormLogin.tsx`, `erp/src/app/(auth)/sem-acesso/page.tsx`, `erp/src/acoes/sessao.ts`, `erp/ferramentas/criar-usuario.mjs`
- Delete: `erp/src/app/page.tsx` (a página inicial renasce no grupo `(painel)` na Task 9)

**Interfaces:**
- Produces: `EstadoForm`, `FORM_INICIAL`, `errosDoZod`, `lerCampos`, `erroPt`, `CampoErro`; actions `entrar(estado, fd)` e `sair()`; script `node ferramentas/criar-usuario.mjs --email=... --nome=... --senha=... [--papel=dono] [--alvo=dev]`.

- [ ] **Step 1: Teste dos helpers de formulário**

`erp/src/lib/forms.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { errosDoZod, lerCampos } from "./forms";

describe("forms", () => {
  it("errosDoZod guarda o primeiro erro de cada campo", () => {
    const schema = z.object({
      nome: z.string().min(1, { error: "nome_obrigatorio" }),
      email: z.email({ error: "email_invalido" }),
    });
    const r = schema.safeParse({ nome: "", email: "x" });
    expect(r.success).toBe(false);
    if (!r.success) expect(errosDoZod(r.error).erros).toEqual({ nome: "nome_obrigatorio", email: "email_invalido" });
  });
  it("lerCampos devolve string aparada e vazio para ausente", () => {
    const fd = new FormData();
    fd.set("nome", "  Shopee ");
    expect(lerCampos(fd, ["nome", "tipo"] as const)).toEqual({ nome: "Shopee", tipo: "" });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar, implementar**

```bash
cd erp && npx vitest run src/lib/forms.test.ts
```

`erp/src/lib/forms.ts`:

```ts
import type { ZodError } from "zod";

export type EstadoForm = { erros: Record<string, string>; ok?: boolean; mensagem?: string };
export const FORM_INICIAL: EstadoForm = { erros: {} };

/** Primeiro erro por campo; a mensagem é uma chave traduzida por erroPt(). */
export function errosDoZod(erro: ZodError): EstadoForm {
  const erros: Record<string, string> = {};
  for (const issue of erro.issues) {
    const campo = issue.path.map(String).join(".") || "_form";
    if (!(campo in erros)) erros[campo] = issue.message;
  }
  return { erros };
}

/** Lê campos de um FormData como strings aparadas (ausente vira ""). */
export function lerCampos<N extends string>(fd: FormData, nomes: readonly N[]): Record<N, string> {
  const saida = {} as Record<N, string>;
  for (const n of nomes) {
    const v = fd.get(n);
    saida[n] = typeof v === "string" ? v.trim() : "";
  }
  return saida;
}
```

`erp/src/lib/erros-pt.ts`:

```ts
const ERROS: Record<string, string> = {
  nome_obrigatorio: "Informe o nome.",
  nome_longo: "Nome longo demais.",
  email_invalido: "E-mail inválido.",
  senha_curta: "A senha precisa de pelo menos 10 caracteres.",
  senha_obrigatoria: "Digite a senha.",
  credenciais_invalidas: "E-mail ou senha incorretos.",
  tipo_invalido: "Tipo inválido.",
  escopo_invalido: "Escopo inválido.",
  papel_invalido: "Papel inválido.",
  codigo_invalido: "Código: só letras minúsculas, até 6.",
  numero_invalido: "Número inválido.",
  percentual_invalido: "Percentual entre 0 e 99,9.",
  inteiro_invalido: "Use um número inteiro.",
  data_invalida: "Data inválida.",
  cor_invalida: "Cor em hexadecimal, como #00D8FF.",
  sem_permissao: "Sua conta não pode fazer isso.",
  duplicado: "Já existe um registro com esse valor.",
  nao_encontrado: "Registro não encontrado.",
  em_uso: "Registro em uso, não pode ser removido.",
  erro_inesperado: "Algo deu errado. Tente de novo.",
};

export function erroPt(chave: string | undefined): string | undefined {
  if (!chave) return undefined;
  return ERROS[chave] ?? chave;
}
```

`erp/src/componentes/painel/CampoErro.tsx`:

```tsx
import { erroPt } from "@/lib/erros-pt";

export function CampoErro({ chave, id }: { chave?: string; id?: string }) {
  const texto = erroPt(chave);
  if (!texto) return null;
  return (
    <p id={id} role="alert" className="text-sm text-erro">
      {texto}
    </p>
  );
}
```

```bash
cd erp && npx vitest run src/lib/forms.test.ts
```

Esperado: 2 testes passando.

- [ ] **Step 3: Páginas e ações de autenticação**

`erp/src/app/(auth)/layout.tsx`:

```tsx
export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
```

`erp/src/app/(auth)/login/acoes.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { clienteServidor } from "@/lib/supabase/servidor";
import { errosDoZod, lerCampos, type EstadoForm } from "@/lib/forms";

const schema = z.object({
  email: z.email({ error: "email_invalido" }),
  senha: z.string().min(1, { error: "senha_obrigatoria" }).max(200),
  voltar: z.string().max(300).optional(),
});

export async function entrar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const campos = lerCampos(fd, ["email", "senha", "voltar"] as const);
  const r = schema.safeParse({ ...campos, voltar: campos.voltar || undefined });
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email: r.data.email, password: r.data.senha });
  if (error) return { erros: { _form: "credenciais_invalidas" } };
  const v = r.data.voltar;
  redirect(v && v.startsWith("/") && !v.startsWith("//") ? v : "/");
}
```

`erp/src/acoes/sessao.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function sair(): Promise<void> {
  const supabase = await clienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
```

`erp/src/app/(auth)/login/FormLogin.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { entrar } from "./acoes";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { CampoErro } from "@/componentes/painel/CampoErro";

export function FormLogin({ voltar }: { voltar?: string }) {
  const [estado, acao, pendente] = useActionState(entrar, FORM_INICIAL);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="voltar" value={voltar ?? ""} />
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required aria-invalid={!!estado.erros.email} aria-describedby="erro-email" />
        <CampoErro id="erro-email" chave={estado.erros.email} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" name="senha" type="password" autoComplete="current-password" required aria-invalid={!!estado.erros.senha} aria-describedby="erro-senha" />
        <CampoErro id="erro-senha" chave={estado.erros.senha} />
      </div>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente ? "Entrando" : "Entrar"}
      </Button>
    </form>
  );
}
```

`erp/src/app/(auth)/login/page.tsx`:

```tsx
import Image from "next/image";
import { FormLogin } from "./FormLogin";

export const metadata = { title: "Entrar" };

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const { voltar } = await searchParams;
  return (
    <div className="rounded-md border border-borda bg-superficie p-6">
      <Image src="/logo.png" alt="FCS 3D Studio" width={1080} height={1080} className="mx-auto mb-6 h-24 w-auto" priority />
      <h1 className="mb-6 text-center text-xl font-bold uppercase tracking-wide">Entrar</h1>
      <FormLogin voltar={voltar} />
    </div>
  );
}
```

`erp/src/app/(auth)/sem-acesso/page.tsx`:

```tsx
import Link from "next/link";
import { sair } from "@/acoes/sessao";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Sem acesso" };

export default async function PaginaSemAcesso({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams;
  return (
    <div className="rounded-md border border-borda bg-superficie p-6 text-center">
      <h1 className="mb-2 text-xl font-bold uppercase">Sem acesso</h1>
      <p className="mb-6 text-sm text-texto-2">
        {area
          ? `Sua conta não abre a área "${area}". Peça ao dono para ajustar o papel.`
          : "Sua conta ainda não foi liberada neste sistema. Peça ao dono para cadastrar seu papel."}
      </p>
      <div className="flex justify-center gap-2">
        <Button asChild variant="secondary">
          <Link href="/">Voltar ao início</Link>
        </Button>
        <form action={sair}>
          <Button type="submit" variant="ghost">Sair</Button>
        </form>
      </div>
    </div>
  );
}
```

Apagar `erp/src/app/page.tsx`.

- [ ] **Step 4: Script de criação de usuário**

`erp/ferramentas/criar-usuario.mjs`:

```js
import { createClient } from "@supabase/supabase-js";
import { carregarEnv, exigirEnv } from "./env.mjs";

carregarEnv();
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  }),
);
const { email, nome, senha, papel = "dono", alvo = "dev" } = args;
if (!email || !nome || !senha) {
  throw new Error("uso: node ferramentas/criar-usuario.mjs --email=... --nome=... --senha=... [--papel=dono|operador|leitura] [--alvo=dev|teste]");
}
if (senha.length < 10) throw new Error("senha com pelo menos 10 caracteres");
const prefixo = alvo === "teste" ? "SUPABASE_TESTE_" : "SUPABASE_";
const admin = createClient(exigirEnv(`${prefixo}URL`), exigirEnv(`${prefixo}SERVICE_ROLE_KEY`), {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-origem": "script" } },
});
const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
if (error) throw error;
const { error: erroLinha } = await admin.from("usuarios_app").insert({ id: data.user.id, nome, papel });
if (erroLinha) throw erroLinha;
console.log(`usuario ${email} criado como ${papel} em ${alvo}`);
```

Criar o primeiro dono no dev com o e-mail real do usuário e uma senha forte escolhida na hora (não registrar a senha em lugar nenhum):

```bash
cd erp && node ferramentas/criar-usuario.mjs --email=focusarq.equipe@gmail.com --nome=Bernardo --senha=<senha> --papel=dono
```

- [ ] **Step 5: Conferir manualmente**

```bash
cd erp && npm run dev
```

Abrir `http://localhost:3000`: deve redirecionar para `/login`. Senha errada mostra "E-mail ou senha incorretos." Senha certa redireciona para `/` (404 nesta tarefa, pois a página do painel chega na Task 9; o importante é o cookie de sessão). `/login` logado redireciona para `/`.

- [ ] **Step 6: Commit**

```bash
git add erp
git commit -m "erp: login, saida, sem acesso e script de criacao de usuario"
```

---

### Task 9: Shell do painel: navegação, sidebar, barra do topo, tema, perfil

**Files:**
- Create: `erp/src/componentes/painel/navegacao.ts`, `navegacao.test.ts`, `Sidebar.tsx`, `BarraTopo.tsx`, `SeletorTema.tsx`, `erp/src/dados/alertas.ts`, `erp/src/app/(painel)/layout.tsx`, `erp/src/app/(painel)/page.tsx` (provisória), `erp/src/app/(painel)/perfil/page.tsx`

**Interfaces:**
- Produces: `FASE_ATUAL`, `GRUPOS`, `gruposVisiveis(papel, fase)`, `itemAtivo(pathname, rota)`, `trilha(pathname)`, tipos `ItemNav`, `GrupoNav`; `contarAlertasAbertos()`; componentes `SidebarPainel`, `BarraTopo`, `SeletorTema`; evento DOM `fcs:abrir-busca` (disparado pelo botão da barra, ouvido pela busca na Task 10).

- [ ] **Step 1: Teste da navegação**

`erp/src/componentes/painel/navegacao.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { gruposVisiveis, itemAtivo, trilha } from "./navegacao";

describe("navegacao", () => {
  it("na fase 1 o dono vê Início e as quatro configurações", () => {
    const grupos = gruposVisiveis("dono", 1);
    expect(grupos.map((g) => g.rotulo)).toEqual(["Geral", "Configurações"]);
    expect(grupos[1].itens.map((i) => i.rotulo)).toEqual(["Canais de venda", "Categorias", "Unidades", "Usuários"]);
  });
  it("leitura não vê Usuários", () => {
    const grupos = gruposVisiveis("leitura", 1);
    expect(grupos[1].itens.map((i) => i.rotulo)).toEqual(["Canais de venda", "Categorias", "Unidades"]);
  });
  it("itens de fases futuras aparecem quando a fase chega", () => {
    expect(gruposVisiveis("dono", 9).flatMap((g) => g.itens).some((i) => i.rota === "/alertas")).toBe(true);
    expect(gruposVisiveis("dono", 1).flatMap((g) => g.itens).some((i) => i.rota === "/alertas")).toBe(false);
  });
  it("marca o item ativo pela rota", () => {
    expect(itemAtivo("/configuracoes/canais/abc", "/configuracoes/canais")).toBe(true);
    expect(itemAtivo("/financeiro/lancamentos", "/financeiro")).toBe(false);
    expect(itemAtivo("/financeiro", "/financeiro")).toBe(true);
    expect(itemAtivo("/", "/")).toBe(true);
    expect(itemAtivo("/configuracoes", "/")).toBe(false);
  });
  it("monta a trilha do breadcrumb", () => {
    expect(trilha("/configuracoes/canais/abc").map((t) => t.rotulo)).toEqual(["Configurações", "Canais de venda", "abc"]);
    expect(trilha("/")).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar, implementar**

```bash
cd erp && npx vitest run src/componentes/painel/navegacao.test.ts
```

`erp/src/componentes/painel/navegacao.ts`:

```ts
import { podeLer, type Area, type Papel } from "@/lib/auth/papeis";
import type { NomeIcone } from "./Icone";

/** Fase mais recente entregue. Itens de fases futuras ficam ocultos. */
export const FASE_ATUAL = 1;

export type ItemNav = { rota: string; rotulo: string; icone: NomeIcone; area: Area; fase: number; contador?: "alertas" };
export type GrupoNav = { rotulo: string; itens: ItemNav[] };

export const GRUPOS: GrupoNav[] = [
  {
    rotulo: "Geral",
    itens: [
      { rota: "/", rotulo: "Início", icone: "inicio", area: "inicio", fase: 1 },
      { rota: "/alertas", rotulo: "Alertas", icone: "alertas", area: "alertas", fase: 9, contador: "alertas" },
    ],
  },
  {
    rotulo: "Conhecimento",
    itens: [{ rota: "/conhecimento", rotulo: "Base de conhecimento", icone: "conhecimento", area: "conhecimento", fase: 2 }],
  },
  {
    rotulo: "Estoque",
    itens: [
      { rota: "/estoque/insumos", rotulo: "Insumos", icone: "estoque", area: "estoque", fase: 3 },
      { rota: "/estoque/movimentacoes", rotulo: "Movimentações", icone: "movimentacoes", area: "estoque", fase: 3 },
      { rota: "/estoque/compras", rotulo: "Compras", icone: "compras", area: "estoque", fase: 3 },
      { rota: "/estoque/fornecedores", rotulo: "Fornecedores", icone: "fornecedores", area: "estoque", fase: 3 },
    ],
  },
  {
    rotulo: "Catálogo",
    itens: [
      { rota: "/catalogo/produtos", rotulo: "Produtos", icone: "produtos", area: "catalogo", fase: 5 },
      { rota: "/catalogo/precificacao", rotulo: "Precificação", icone: "calculadora", area: "catalogo", fase: 4 },
    ],
  },
  {
    rotulo: "Produção",
    itens: [
      { rota: "/producao/fila", rotulo: "Fila de produção", icone: "producao", area: "producao", fase: 5 },
      { rota: "/producao/impressoras", rotulo: "Impressoras", icone: "impressoras", area: "producao", fase: 5 },
    ],
  },
  {
    rotulo: "Vendas",
    itens: [
      { rota: "/vendas/pedidos", rotulo: "Pedidos", icone: "pedidos", area: "vendas", fase: 6 },
      { rota: "/vendas/clientes", rotulo: "Clientes", icone: "clientes", area: "vendas", fase: 6 },
    ],
  },
  {
    rotulo: "Financeiro",
    itens: [
      { rota: "/financeiro", rotulo: "Visão geral", icone: "financeiro", area: "financeiro", fase: 7 },
      { rota: "/financeiro/lancamentos", rotulo: "Lançamentos", icone: "lancamentos", area: "financeiro", fase: 7 },
    ],
  },
  {
    rotulo: "Planejamento",
    itens: [
      { rota: "/planejamento", rotulo: "Calendário", icone: "planejamento", area: "planejamento", fase: 8 },
      { rota: "/planejamento/quadro", rotulo: "Quadro", icone: "quadro", area: "planejamento", fase: 8 },
    ],
  },
  { rotulo: "Relatórios", itens: [{ rota: "/relatorios", rotulo: "Relatórios", icone: "relatorios", area: "relatorios", fase: 9 }] },
  {
    rotulo: "Configurações",
    itens: [
      { rota: "/configuracoes/canais", rotulo: "Canais de venda", icone: "canais", area: "configuracoes", fase: 1 },
      { rota: "/configuracoes/categorias", rotulo: "Categorias", icone: "categorias", area: "configuracoes", fase: 1 },
      { rota: "/configuracoes/unidades", rotulo: "Unidades", icone: "unidades", area: "configuracoes", fase: 1 },
      { rota: "/configuracoes/usuarios", rotulo: "Usuários", icone: "usuarios", area: "usuarios", fase: 1 },
      { rota: "/configuracoes/integracoes", rotulo: "Integrações", icone: "integracoes", area: "usuarios", fase: 2 },
      { rota: "/configuracoes/auditoria", rotulo: "Auditoria", icone: "auditoria", area: "usuarios", fase: 9 },
    ],
  },
];

const TODAS_ROTAS = GRUPOS.flatMap((g) => g.itens.map((i) => i.rota));

export function gruposVisiveis(papel: Papel | null, fase = FASE_ATUAL): GrupoNav[] {
  return GRUPOS.map((g) => ({ ...g, itens: g.itens.filter((i) => i.fase <= fase && podeLer(papel, i.area)) })).filter(
    (g) => g.itens.length > 0,
  );
}

/** Ativo quando a rota bate ou é prefixo, exceto se outro item for mais específico. */
export function itemAtivo(pathname: string, rota: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (rota === "/") return p === "/";
  if (p === rota) return true;
  const temFilho = TODAS_ROTAS.some((r) => r !== rota && r.startsWith(`${rota}/`));
  return !temFilho && p.startsWith(`${rota}/`);
}

const ROTULOS_SEGMENTO: Record<string, string> = {
  configuracoes: "Configurações", estoque: "Estoque", catalogo: "Catálogo", producao: "Produção", vendas: "Vendas",
  financeiro: "Financeiro", planejamento: "Planejamento", relatorios: "Relatórios", conhecimento: "Conhecimento",
  perfil: "Perfil", novo: "Novo", nova: "Nova",
};

/** Trilha para o breadcrumb: rótulos conhecidos da navegação, resto vira o segmento. */
export function trilha(pathname: string): { rotulo: string; rota: string }[] {
  const partes = (pathname.replace(/\/+$/, "") || "/").split("/").filter(Boolean);
  const itens = GRUPOS.flatMap((g) => g.itens);
  const saida: { rotulo: string; rota: string }[] = [];
  let acumulado = "";
  for (const parte of partes) {
    acumulado += `/${parte}`;
    const item = itens.find((i) => i.rota === acumulado);
    saida.push({ rotulo: item?.rotulo ?? ROTULOS_SEGMENTO[parte] ?? parte, rota: acumulado });
  }
  return saida;
}
```

Observação: `navegacao.ts` importa só o tipo `NomeIcone` (`import type`), então não puxa React. Rodar o teste: 5 passando.

- [ ] **Step 3: Dados de alertas**

`erp/src/dados/alertas.ts`:

```ts
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function contarAlertasAbertos(): Promise<number> {
  const supabase = await clienteServidor();
  const { count } = await supabase.from("alertas").select("id", { count: "exact", head: true }).is("resolvido_em", null);
  return count ?? 0;
}
```

- [ ] **Step 4: Seletor de tema**

`erp/src/componentes/painel/SeletorTema.tsx`:

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { COOKIE_TEMA, lerTema, type Tema } from "@/lib/tema";
import { Button } from "@/componentes/ui/button";

export function SeletorTema({ inicial }: { inicial: Tema }) {
  const [tema, setTema] = useState<Tema>(inicial);
  const router = useRouter();
  function alternar() {
    const novo: Tema = tema === "escuro" ? "claro" : "escuro";
    setTema(novo);
    document.documentElement.dataset.tema = novo;
    document.cookie = `${COOKIE_TEMA}=${novo}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  const rotulo = tema === "escuro" ? "Usar tema claro" : "Usar tema escuro";
  return (
    <Button variant="ghost" size="icon" onClick={alternar} aria-label={rotulo} title={rotulo} data-tema-atual={lerTema(tema)}>
      {tema === "escuro" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
```

- [ ] **Step 5: Sidebar**

`erp/src/componentes/painel/Sidebar.tsx`:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { sair } from "@/acoes/sessao";
import { PAPEL_ROTULO, type Papel } from "@/lib/auth/papeis";
import { Icone } from "./Icone";
import { itemAtivo, type GrupoNav } from "./navegacao";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/componentes/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/componentes/ui/dropdown-menu";

type Usuario = { nome: string; email: string; papel: Papel };

export function SidebarPainel({ grupos, usuario, contadores }: { grupos: GrupoNav[]; usuario: Usuario; contadores: { alertas: number } }) {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-borda">
        <Link href="/" className="flex items-center gap-2 px-2" aria-label="FCS ERP, início">
          <Image src="/logo.png" alt="" width={1080} height={1080} className="size-8 shrink-0 rounded-sm" />
          <span className="font-titulo text-sm font-bold uppercase tracking-wide group-data-[collapsible=icon]:hidden">FCS ERP</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.rotulo}>
            <SidebarGroupLabel>{grupo.rotulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.itens.map((item) => {
                  const contador = item.contador ? contadores[item.contador] : 0;
                  return (
                    <SidebarMenuItem key={item.rota}>
                      <SidebarMenuButton asChild isActive={itemAtivo(pathname, item.rota)} tooltip={item.rotulo}>
                        <Link href={item.rota}>
                          <Icone nome={item.icone} className="size-4" />
                          <span>{item.rotulo}</span>
                        </Link>
                      </SidebarMenuButton>
                      {contador > 0 && <SidebarMenuBadge className="bg-alerta text-fundo">{contador}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-borda">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip={usuario.nome} aria-label="Menu do usuário">
                  <User className="size-4" />
                  <span className="flex min-w-0 flex-col text-left leading-tight">
                    <span className="truncate text-sm">{usuario.nome}</span>
                    <span className="truncate text-xs text-texto-3">{PAPEL_ROTULO[usuario.papel]}</span>
                  </span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/perfil">Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void sair()}>
                  <LogOut className="size-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
```

- [ ] **Step 6: Barra do topo**

`erp/src/componentes/painel/BarraTopo.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { podeEscrever, type Papel } from "@/lib/auth/papeis";
import type { Tema } from "@/lib/tema";
import { trilha } from "./navegacao";
import { SeletorTema } from "./SeletorTema";
import { SidebarTrigger } from "@/componentes/ui/sidebar";
import { Button } from "@/componentes/ui/button";
import { Separator } from "@/componentes/ui/separator";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/componentes/ui/breadcrumb";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/componentes/ui/dropdown-menu";

const ATALHOS_NOVO: { rotulo: string; rota: string; area: "configuracoes" }[] = [
  { rotulo: "Canal de venda", rota: "/configuracoes/canais?novo=1", area: "configuracoes" },
  { rotulo: "Categoria", rota: "/configuracoes/categorias?novo=1", area: "configuracoes" },
];

export function BarraTopo({ papel, tema }: { papel: Papel; tema: Tema }) {
  const pathname = usePathname();
  const partes = trilha(pathname);
  const atalhos = ATALHOS_NOVO.filter((a) => podeEscrever(papel, a.area));
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-borda bg-fundo/95 px-3 backdrop-blur md:px-4">
      <SidebarTrigger aria-label="Abrir ou recolher o menu" />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          <BreadcrumbItem>
            {partes.length === 0 ? <BreadcrumbPage>Início</BreadcrumbPage> : <BreadcrumbLink asChild><Link href="/">Início</Link></BreadcrumbLink>}
          </BreadcrumbItem>
          {partes.map((p, i) => (
            <span key={p.rota} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {i === partes.length - 1 ? <BreadcrumbPage>{p.rotulo}</BreadcrumbPage> : <BreadcrumbLink asChild><Link href={p.rota}>{p.rotulo}</Link></BreadcrumbLink>}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <Button
        variant="outline"
        size="sm"
        className="hidden min-w-56 justify-between text-texto-2 md:flex"
        onClick={() => window.dispatchEvent(new CustomEvent("fcs:abrir-busca"))}
      >
        <span className="flex items-center gap-2"><Search className="size-4" /> Buscar</span>
        <kbd className="rounded-sm border border-borda bg-superficie-2 px-1.5 font-mono text-[11px]">Ctrl K</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buscar" onClick={() => window.dispatchEvent(new CustomEvent("fcs:abrir-busca"))}>
        <Search className="size-4" />
      </Button>
      {atalhos.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm"><Plus className="size-4" /> <span className="hidden sm:inline">Novo</span></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {atalhos.map((a) => (
              <DropdownMenuItem key={a.rota} asChild><Link href={a.rota}>{a.rotulo}</Link></DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <SeletorTema inicial={tema} />
    </header>
  );
}
```

- [ ] **Step 7: Layout do painel, página inicial provisória e perfil**

`erp/src/app/(painel)/layout.tsx`:

```tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth/sessao";
import { COOKIE_TEMA, lerTema } from "@/lib/tema";
import { gruposVisiveis } from "@/componentes/painel/navegacao";
import { contarAlertasAbertos } from "@/dados/alertas";
import { SidebarInset, SidebarProvider } from "@/componentes/ui/sidebar";
import { SidebarPainel } from "@/componentes/painel/Sidebar";
import { BarraTopo } from "@/componentes/painel/BarraTopo";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/sem-acesso");
  const jar = await cookies();
  const aberta = jar.get("sidebar_state")?.value !== "false";
  const tema = lerTema(jar.get(COOKIE_TEMA)?.value);
  const alertas = await contarAlertasAbertos();
  return (
    <SidebarProvider defaultOpen={aberta}>
      <SidebarPainel grupos={gruposVisiveis(usuario.papel)} usuario={usuario} contadores={{ alertas }} />
      <SidebarInset>
        <BarraTopo papel={usuario.papel} tema={tema} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

Conferir em `src/componentes/ui/sidebar.tsx` o nome do cookie (`SIDEBAR_COOKIE_NAME`); se for diferente de `sidebar_state`, usar o valor do arquivo.

`erp/src/app/(painel)/page.tsx` (provisória, substituída na Task 13):

```tsx
export default function PaginaInicio() {
  return <h1 className="text-2xl font-bold uppercase">Início</h1>;
}
```

`erp/src/app/(painel)/perfil/page.tsx`:

```tsx
import { usuarioAtual } from "@/lib/auth/sessao";
import { PAPEL_ROTULO } from "@/lib/auth/papeis";
import { sair } from "@/acoes/sessao";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Perfil" };

export default async function PaginaPerfil() {
  const usuario = (await usuarioAtual())!;
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold uppercase">Perfil</h1>
      <dl className="grid grid-cols-[8rem_1fr] gap-y-2 rounded-md border border-borda bg-superficie p-4 text-sm">
        <dt className="text-texto-2">Nome</dt><dd>{usuario.nome}</dd>
        <dt className="text-texto-2">E-mail</dt><dd>{usuario.email}</dd>
        <dt className="text-texto-2">Papel</dt><dd>{PAPEL_ROTULO[usuario.papel]}</dd>
      </dl>
      <p className="text-sm text-texto-2">Para trocar a senha ou o tema, use o menu do topo. Troca de senha pela tela chega com a Fase 10.</p>
      <form action={sair}><Button variant="secondary" type="submit">Sair</Button></form>
    </div>
  );
}
```

- [ ] **Step 8: Conferir e commitar**

```bash
cd erp && npm run lint && npm run typecheck && npm test && npm run build
```

Abrir `npm run dev`, logar: sidebar com grupos Geral e Configurações, recolher pelo botão (trilho de ícones com tooltip), breadcrumb muda em `/configuracoes/canais` (404 ainda, página chega na Task 12), tema alterna e persiste ao recarregar, menu do usuário com Perfil e Sair.

```bash
git add erp
git commit -m "erp: shell do painel com sidebar, barra do topo, tema e perfil"
```

---

### Task 10: Busca global (Ctrl+K)

**Files:**
- Create: `erp/src/componentes/painel/busca-agrupar.ts`, `busca-agrupar.test.ts`, `erp/src/acoes/busca.ts`, `erp/src/componentes/painel/BuscaGlobal.tsx`
- Modify: `erp/src/app/(painel)/layout.tsx` (monta `<BuscaGlobal />`)

**Interfaces:**
- Produces: `TIPOS_BUSCA`, `ROTULO_TIPO`, `TIPOS_DISPONIVEIS` (fase 1: canal, categoria, unidade), `agruparResultados(lista)`, tipos `ResultadoBusca`, `GrupoBusca`; action `buscar({ termo, tipos })`.

- [ ] **Step 1: Teste do agrupamento**

`erp/src/componentes/painel/busca-agrupar.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { agruparResultados, type ResultadoBusca } from "./busca-agrupar";

const r = (tipo: ResultadoBusca["tipo"], titulo: string, pontuacao = 1): ResultadoBusca => ({
  tipo, id: titulo, titulo, subtitulo: null, rota: `/x/${titulo}`, pontuacao,
});

describe("agruparResultados", () => {
  it("agrupa na ordem fixa dos tipos e mantém a ordem interna", () => {
    const grupos = agruparResultados([r("unidade", "grama"), r("canal", "Shopee"), r("canal", "TikTok", 0.5), r("categoria", "Games")]);
    expect(grupos.map((g) => g.rotulo)).toEqual(["Canais", "Categorias", "Unidades"]);
    expect(grupos[0].itens.map((i) => i.titulo)).toEqual(["Shopee", "TikTok"]);
  });
  it("lista vazia vira sem grupos", () => {
    expect(agruparResultados([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar, implementar**

```bash
cd erp && npx vitest run src/componentes/painel/busca-agrupar.test.ts
```

`erp/src/componentes/painel/busca-agrupar.ts`:

```ts
export const TIPOS_BUSCA = [
  "canal", "categoria", "unidade", "insumo", "lote", "fornecedor", "produto", "ordem", "pedido", "cliente",
  "lancamento", "conhecimento", "tarefa",
] as const;
export type TipoBusca = (typeof TIPOS_BUSCA)[number];

export const ROTULO_TIPO: Record<TipoBusca, string> = {
  canal: "Canais", categoria: "Categorias", unidade: "Unidades", insumo: "Insumos", lote: "Lotes",
  fornecedor: "Fornecedores", produto: "Produtos", ordem: "Ordens de produção", pedido: "Pedidos",
  cliente: "Clientes", lancamento: "Lançamentos", conhecimento: "Conhecimento", tarefa: "Tarefas",
};

/** Tipos que a função buscar_global já atende. Cada fase acrescenta os seus. */
export const TIPOS_DISPONIVEIS: TipoBusca[] = ["canal", "categoria", "unidade"];

export type ResultadoBusca = {
  tipo: TipoBusca; id: string; titulo: string; subtitulo: string | null; rota: string; pontuacao: number;
};
export type GrupoBusca = { tipo: TipoBusca; rotulo: string; itens: ResultadoBusca[] };

/** Agrupa na ordem de TIPOS_BUSCA; dentro do grupo mantém a ordem recebida (já vem por pontuação). */
export function agruparResultados(lista: ResultadoBusca[]): GrupoBusca[] {
  const porTipo = new Map<TipoBusca, ResultadoBusca[]>();
  for (const item of lista) {
    const atual = porTipo.get(item.tipo) ?? [];
    atual.push(item);
    porTipo.set(item.tipo, atual);
  }
  return TIPOS_BUSCA.filter((t) => porTipo.has(t)).map((t) => ({ tipo: t, rotulo: ROTULO_TIPO[t], itens: porTipo.get(t)! }));
}
```

Esperado: 2 testes passando.

- [ ] **Step 3: Action**

`erp/src/acoes/busca.ts`:

```ts
"use server";

import { z } from "zod";
import { clienteServidor } from "@/lib/supabase/servidor";
import { usuarioAtual } from "@/lib/auth/sessao";
import { TIPOS_BUSCA, type ResultadoBusca, type TipoBusca } from "@/componentes/painel/busca-agrupar";

const schema = z.object({
  termo: z.string().trim().min(1).max(80),
  tipos: z.array(z.enum(TIPOS_BUSCA)).max(20).optional(),
});

export async function buscar(entrada: { termo: string; tipos?: TipoBusca[] }): Promise<ResultadoBusca[]> {
  const r = schema.safeParse(entrada);
  if (!r.success) return [];
  if (!(await usuarioAtual())) return [];
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("buscar_global", {
    termo: r.data.termo,
    tipos: r.data.tipos && r.data.tipos.length > 0 ? r.data.tipos : undefined,
    limite: 6,
  });
  if (error || !data) return [];
  return data as ResultadoBusca[];
}
```

- [ ] **Step 4: Diálogo de busca**

`erp/src/componentes/painel/BuscaGlobal.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buscar } from "@/acoes/busca";
import { agruparResultados, ROTULO_TIPO, TIPOS_DISPONIVEIS, type ResultadoBusca, type TipoBusca } from "./busca-agrupar";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/componentes/ui/command";
import { cn } from "@/lib/utils";

export function BuscaGlobal() {
  const [aberta, setAberta] = useState(false);
  const [termo, setTermo] = useState("");
  const [tipos, setTipos] = useState<TipoBusca[]>([]);
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  const ultimo = useRef(0);

  useEffect(() => {
    function atalho(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberta((v) => !v);
      }
    }
    function abrir() { setAberta(true); }
    window.addEventListener("keydown", atalho);
    window.addEventListener("fcs:abrir-busca", abrir);
    return () => {
      window.removeEventListener("keydown", atalho);
      window.removeEventListener("fcs:abrir-busca", abrir);
    };
  }, []);

  useEffect(() => {
    const t = termo.trim();
    if (!t) { setResultados([]); return; }
    const id = ++ultimo.current;
    const timer = setTimeout(() => {
      iniciar(async () => {
        const lista = await buscar({ termo: t, tipos });
        if (id === ultimo.current) setResultados(lista);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [termo, tipos]);

  function alternarTipo(tipo: TipoBusca) {
    setTipos((atual) => (atual.includes(tipo) ? atual.filter((x) => x !== tipo) : [...atual, tipo]));
  }

  function ir(rota: string) {
    setAberta(false);
    setTermo("");
    router.push(rota);
  }

  const grupos = agruparResultados(resultados);
  return (
    <CommandDialog open={aberta} onOpenChange={setAberta} title="Busca global" description="Busque por nome, código ou categoria" shouldFilter={false}>
      <CommandInput placeholder="Buscar canal, categoria, unidade..." value={termo} onValueChange={setTermo} />
      <div className="flex flex-wrap gap-1 border-b border-borda px-3 py-2" role="group" aria-label="Filtrar por tipo">
        {TIPOS_DISPONIVEIS.map((tipo) => (
          <button
            key={tipo}
            type="button"
            onClick={() => alternarTipo(tipo)}
            aria-pressed={tipos.includes(tipo)}
            className={cn("rounded-sm border px-2 py-0.5 text-xs", tipos.includes(tipo) ? "border-acao bg-acao-suave text-texto" : "border-borda text-texto-2")}
          >
            {ROTULO_TIPO[tipo]}
          </button>
        ))}
      </div>
      <CommandList>
        {termo.trim() && !pendente && grupos.length === 0 && <CommandEmpty>Nada encontrado para "{termo.trim()}".</CommandEmpty>}
        {!termo.trim() && <CommandEmpty>Digite para buscar. Setas para navegar, Enter para abrir.</CommandEmpty>}
        {grupos.map((g) => (
          <CommandGroup key={g.tipo} heading={g.rotulo}>
            {g.itens.map((r) => (
              <CommandItem key={`${r.tipo}-${r.id}`} value={`${r.tipo}-${r.id}`} onSelect={() => ir(r.rota)}>
                <span className="truncate">{r.titulo}</span>
                {r.subtitulo && <span className="ml-auto truncate text-xs text-texto-3">{r.subtitulo}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
```

Montar no layout do painel, dentro do `SidebarProvider`, depois do `SidebarInset`: `<BuscaGlobal />` (import de `@/componentes/painel/BuscaGlobal`).

- [ ] **Step 5: Conferir e commitar**

`npm run dev`, logar, Ctrl+K, digitar "formula": grupo Categorias com "Fórmula 1"; Enter navega para `/configuracoes/categorias?escopo=produto&destaque=...` (404 até a Task 12). Filtro "Unidades" + "kg" devolve "quilograma". Escape fecha.

```bash
cd erp && npm run lint && npm run typecheck && npm test
git add erp
git commit -m "erp: busca global com Ctrl+K, filtros por tipo e agrupamento"
```

---

### Task 11: Componentes de dados e de formulário

**Files:**
- Create: `erp/src/componentes/painel/TabelaDados.tsx`, `CartaoIndicador.tsx`, `EstadoVazio.tsx`, `Banner.tsx`, `SeletorPeriodo.tsx`, `BotaoAcao.tsx`, `DialogoNovo.tsx`, `Campo.tsx`, `SelectNativo.tsx`, `useAoSalvar.ts`
- Modify: `erp/src/lib/forms.ts` (campos zod reutilizáveis e `ResultadoAcao`), `erp/src/lib/forms.test.ts`

**Interfaces:**
- Produces: `TabelaDados<T>({ colunas, dados, vazio, placeholderFiltro?, tamanhoPagina?, idLinha?, destaque? })`, `CartaoIndicador({ rotulo, valor, variacao?, dica?, rodape? })`, `EstadoVazio`, `Banner({ tipo, titulo, children, acao })`, `SeletorPeriodo`, `lerPeriodo`, `BotaoAcao({ acao, confirmar?, children })`, `DialogoNovo({ rotulo, titulo, abrirInicial, children })`, `ContextoDialogo`, `Campo`, `SelectNativo`, `useAoSalvar(estado, aoSalvar)`; em `forms.ts`: `ResultadoAcao`, `campoFracao`, `campoValor`, `campoInteiro`, `textoOpcional(max)`.

- [ ] **Step 1: Teste dos campos zod**

Acrescentar a `erp/src/lib/forms.test.ts`:

```ts
import { campoFracao, campoInteiro, campoValor } from "./forms";

describe("campos numéricos", () => {
  it("percentual digitado vira fração; vazio vira null; texto vira erro", () => {
    expect(campoFracao.safeParse("14,5").data).toBe(0.145);
    expect(campoFracao.safeParse("").data).toBeNull();
    expect(campoFracao.safeParse("abc").success).toBe(false);
    expect(campoFracao.safeParse("100").success).toBe(false);
  });
  it("valor e inteiro", () => {
    expect(campoValor.safeParse("4,00").data).toBe(4);
    expect(campoInteiro.safeParse("7").data).toBe(7);
    expect(campoInteiro.safeParse("7,5").success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar, implementar em `forms.ts`**

Acrescentar ao fim de `erp/src/lib/forms.ts`:

```ts
import { z } from "zod";
import { lerNumeroPt, percentualParaFracao } from "@/lib/formatos/numero";

export type ResultadoAcao = { ok: boolean; mensagem?: string; erro?: string };

const vazioParaNull = (f: (t: string) => number | null) => (v: unknown) => {
  if (v === "" || v == null) return null;
  const n = f(String(v));
  return n === null ? Number.NaN : n;
};

/** "14,5" (por cento) para 0.145; aceita 0 a 99,9999. */
export const campoFracao = z.preprocess(
  vazioParaNull(percentualParaFracao),
  z.number({ error: "percentual_invalido" }).min(0, { error: "percentual_invalido" }).lt(1, { error: "percentual_invalido" }).nullable(),
);
export const campoValor = z.preprocess(
  vazioParaNull(lerNumeroPt),
  z.number({ error: "numero_invalido" }).min(0, { error: "numero_invalido" }).nullable(),
);
export const campoInteiro = z.preprocess(
  vazioParaNull(lerNumeroPt),
  z.number({ error: "inteiro_invalido" }).int({ error: "inteiro_invalido" }).min(0, { error: "inteiro_invalido" }).nullable(),
);
export const textoOpcional = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.string().max(max).nullable());
```

Mover o `import type { ZodError }` para `import { z, type ZodError } from "zod";` no topo do arquivo. Rodar `npx vitest run src/lib/forms.test.ts`: 4 testes passando.

- [ ] **Step 3: Componentes**

`erp/src/componentes/painel/EstadoVazio.tsx`:

```tsx
import { Inbox } from "lucide-react";

export function EstadoVazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-borda px-6 py-12 text-center">
      <Inbox className="size-6 text-texto-3" aria-hidden="true" />
      <p className="font-medium">{titulo}</p>
      {descricao && <p className="max-w-md text-sm text-texto-2">{descricao}</p>}
      {acao}
    </div>
  );
}
```

`erp/src/componentes/painel/Banner.tsx`:

```tsx
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ESTILOS = {
  info: "border-acao/40", sucesso: "border-sucesso/50", alerta: "border-alerta/50", erro: "border-erro/50",
} as const;
const ICONES = { info: Info, sucesso: CheckCircle2, alerta: AlertTriangle, erro: XCircle } as const;
const COR_ICONE = { info: "text-acao", sucesso: "text-sucesso", alerta: "text-alerta", erro: "text-erro" } as const;

export function Banner({ tipo = "info", titulo, children, acao }: {
  tipo?: keyof typeof ESTILOS; titulo?: string; children?: React.ReactNode; acao?: React.ReactNode;
}) {
  const IconeTipo = ICONES[tipo];
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-md border bg-superficie p-3 text-sm", ESTILOS[tipo])}>
      <IconeTipo className={cn("mt-0.5 size-4 shrink-0", COR_ICONE[tipo])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-medium">{titulo}</p>}
        {children && <div className="text-texto-2">{children}</div>}
      </div>
      {acao}
    </div>
  );
}
```

`erp/src/componentes/painel/CartaoIndicador.tsx`:

```tsx
import { formatarNumero } from "@/lib/formatos/numero";
import { cn } from "@/lib/utils";

export function CartaoIndicador({ rotulo, valor, variacao, dica, rodape, className }: {
  rotulo: string;
  valor: string | null;
  variacao?: { percentual: number | null; rotulo: string };
  dica?: string;
  rodape?: React.ReactNode;
  className?: string;
}) {
  const semDados = valor === null;
  return (
    <section className={cn("flex flex-col gap-1 rounded-md border border-borda bg-superficie p-4", className)} aria-label={rotulo}>
      <h3 className="text-xs font-medium uppercase tracking-wide text-texto-2">{rotulo}</h3>
      <p className={cn("numeros font-titulo text-2xl font-bold", semDados && "text-lg font-medium text-texto-3")}>
        {semDados ? "Sem dados" : valor}
      </p>
      {!semDados && variacao && variacao.percentual !== null && (
        <p className={cn("text-xs", variacao.percentual >= 0 ? "text-sucesso" : "text-erro")}>
          {variacao.percentual >= 0 ? "+" : ""}{formatarNumero(variacao.percentual * 100, 1)} % {variacao.rotulo}
        </p>
      )}
      {semDados && dica && <p className="text-xs text-texto-3">{dica}</p>}
      {rodape}
    </section>
  );
}
```

`erp/src/componentes/painel/SeletorPeriodo.tsx`:

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";

export const PERIODOS = [
  { chave: "mes", rotulo: "Este mês" },
  { chave: "mes-anterior", rotulo: "Mês anterior" },
  { chave: "30d", rotulo: "30 dias" },
  { chave: "12m", rotulo: "12 meses" },
] as const;
export type Periodo = (typeof PERIODOS)[number]["chave"];

export function lerPeriodo(valor: string | undefined): Periodo {
  return PERIODOS.some((p) => p.chave === valor) ? (valor as Periodo) : "mes";
}

export function SeletorPeriodo({ atual, base }: { atual: Periodo; base: string }) {
  return (
    <nav aria-label="Período" className="flex gap-1 rounded-md border border-borda bg-superficie p-1">
      {PERIODOS.map((p) => (
        <Link
          key={p.chave}
          href={`${base}?periodo=${p.chave}`}
          aria-current={p.chave === atual ? "page" : undefined}
          className={cn("rounded-sm px-3 py-1 text-sm", p.chave === atual ? "bg-acao-suave text-texto" : "text-texto-2 hover:text-texto")}
        >
          {p.rotulo}
        </Link>
      ))}
    </nav>
  );
}
```

`erp/src/componentes/painel/Campo.tsx`:

```tsx
import { Label } from "@/componentes/ui/label";
import { CampoErro } from "./CampoErro";

export function Campo({ rotulo, nome, erro, dica, children }: {
  rotulo: string; nome: string; erro?: string; dica?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={nome}>{rotulo}</Label>
      {children}
      {dica && !erro && <p className="text-xs text-texto-3">{dica}</p>}
      <CampoErro id={`erro-${nome}`} chave={erro} />
    </div>
  );
}
```

`erp/src/componentes/painel/SelectNativo.tsx`:

```tsx
import { cn } from "@/lib/utils";

export function SelectNativo({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-texto focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
      {...props}
    />
  );
}
```

`erp/src/componentes/painel/useAoSalvar.ts`:

```ts
"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { EstadoForm } from "@/lib/forms";

/** Quando a action devolve ok, mostra o toast e chama aoSalvar (fechar diálogo, limpar). */
export function useAoSalvar(estado: EstadoForm, aoSalvar?: () => void) {
  const anterior = useRef(estado);
  useEffect(() => {
    if (estado === anterior.current) return;
    anterior.current = estado;
    if (estado.ok) {
      toast.success(estado.mensagem ?? "Salvo.");
      aoSalvar?.();
    }
  }, [estado, aoSalvar]);
}
```

`erp/src/componentes/painel/DialogoNovo.tsx`:

```tsx
"use client";

import { createContext, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/componentes/ui/dialog";

/** Formulários dentro do diálogo chamam fechar() ao salvar. */
export const ContextoDialogo = createContext<() => void>(() => {});

export function DialogoNovo({ rotulo, titulo, abrirInicial = false, children }: {
  rotulo: string; titulo: string; abrirInicial?: boolean; children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(abrirInicial);
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> {rotulo}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{titulo}</DialogTitle></DialogHeader>
        <ContextoDialogo.Provider value={() => setAberto(false)}>{children}</ContextoDialogo.Provider>
      </DialogContent>
    </Dialog>
  );
}
```

`erp/src/componentes/painel/BotaoAcao.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ResultadoAcao } from "@/lib/forms";
import { erroPt } from "@/lib/erros-pt";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/componentes/ui/dialog";

type Props = {
  acao: () => Promise<ResultadoAcao>;
  confirmar?: { titulo: string; descricao?: string; rotulo?: string };
  children: React.ReactNode;
  variant?: "ghost" | "secondary" | "destructive" | "outline";
  size?: "sm" | "default" | "icon";
};

export function BotaoAcao({ acao, confirmar, children, variant = "ghost", size = "sm" }: Props) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  function executar() {
    iniciar(async () => {
      const r = await acao();
      if (r.ok) toast.success(r.mensagem ?? "Feito.");
      else toast.error(erroPt(r.erro) ?? "Algo deu errado.");
      setAberto(false);
    });
  }
  if (!confirmar) {
    return <Button variant={variant} size={size} disabled={pendente} onClick={executar}>{children}</Button>;
  }
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild><Button variant={variant} size={size}>{children}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirmar.titulo}</DialogTitle>
          {confirmar.descricao && <DialogDescription>{confirmar.descricao}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setAberto(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={pendente} onClick={executar}>{confirmar.rotulo ?? "Confirmar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

`erp/src/componentes/painel/TabelaDados.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  type ColumnDef, type SortingState, flexRender, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, useReactTable,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";
import { Input } from "@/componentes/ui/input";
import { Button } from "@/componentes/ui/button";
import { EstadoVazio } from "./EstadoVazio";
import { cn } from "@/lib/utils";

export function TabelaDados<T>({ colunas, dados, vazio, placeholderFiltro = "Filtrar", tamanhoPagina = 25, idLinha, destaque }: {
  colunas: ColumnDef<T, unknown>[];
  dados: T[];
  vazio: { titulo: string; descricao?: string; acao?: React.ReactNode };
  placeholderFiltro?: string;
  tamanhoPagina?: number;
  idLinha?: (linha: T) => string;
  destaque?: string;
}) {
  const [ordenacao, setOrdenacao] = useState<SortingState>([]);
  const [filtro, setFiltro] = useState("");
  const tabela = useReactTable({
    data: dados,
    columns: colunas,
    state: { sorting: ordenacao, globalFilter: filtro },
    onSortingChange: setOrdenacao,
    onGlobalFilterChange: setFiltro,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: tamanhoPagina } },
  });

  if (dados.length === 0) return <EstadoVazio {...vazio} />;

  const linhas = tabela.getRowModel().rows;
  const total = tabela.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = tabela.getState().pagination;
  const de = total === 0 ? 0 : pageIndex * pageSize + 1;
  const ate = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <div className="space-y-3">
      <Input
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder={placeholderFiltro}
        aria-label={placeholderFiltro}
        className="max-w-xs"
      />
      <div className="overflow-x-auto rounded-md border border-borda">
        <Table>
          <TableHeader>
            {tabela.getHeaderGroups().map((grupo) => (
              <TableRow key={grupo.id} className="bg-superficie-2">
                {grupo.headers.map((cabecalho) => {
                  const ordenavel = cabecalho.column.getCanSort();
                  const direcao = cabecalho.column.getIsSorted();
                  return (
                    <TableHead key={cabecalho.id} className="h-10 whitespace-nowrap">
                      {cabecalho.isPlaceholder ? null : ordenavel ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium"
                          onClick={cabecalho.column.getToggleSortingHandler()}
                          aria-sort={direcao === "asc" ? "ascending" : direcao === "desc" ? "descending" : "none"}
                        >
                          {flexRender(cabecalho.column.columnDef.header, cabecalho.getContext())}
                          {direcao === "asc" ? <ArrowUp className="size-3" /> : direcao === "desc" ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 text-texto-3" />}
                        </button>
                      ) : (
                        flexRender(cabecalho.column.columnDef.header, cabecalho.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {linhas.length === 0 ? (
              <TableRow><TableCell colSpan={colunas.length} className="py-8 text-center text-texto-2">Nenhum resultado para o filtro.</TableCell></TableRow>
            ) : (
              linhas.map((linha) => (
                <TableRow
                  key={linha.id}
                  className={cn("h-10", idLinha && destaque && idLinha(linha.original) === destaque && "bg-acao-suave")}
                >
                  {linha.getVisibleCells().map((celula) => (
                    <TableCell key={celula.id} className="py-1.5">{flexRender(celula.column.columnDef.cell, celula.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {total > pageSize && (
        <div className="flex items-center justify-between text-sm text-texto-2">
          <span className="numeros">{de} a {ate} de {total}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => tabela.previousPage()} disabled={!tabela.getCanPreviousPage()}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => tabela.nextPage()} disabled={!tabela.getCanNextPage()}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Conferir e commitar**

```bash
cd erp && npm run lint && npm run typecheck && npm test
git add erp
git commit -m "erp: tabela de dados, cartao indicador, banner, dialogos e campos de formulario"
```

---

### Task 12: Telas de configuração: canais, categorias, unidades, usuários

**Files:**
- Create: `erp/src/dados/configuracoes/canais.ts`, `categorias.ts`, `unidades.ts`, `usuarios.ts`; `erp/src/acoes/configuracoes/canais.ts`, `categorias.ts`, `unidades.ts`, `usuarios.ts`; `erp/src/componentes/configuracoes/FormCanal.tsx`, `FormTaxas.tsx`, `TabelaCanais.tsx`, `FormCategoria.tsx`, `TabelaCategorias.tsx`, `FormUnidade.tsx`, `TabelaUnidades.tsx`, `FormUsuario.tsx`, `TabelaUsuarios.tsx`; páginas `erp/src/app/(painel)/configuracoes/canais/page.tsx`, `canais/[id]/page.tsx`, `categorias/page.tsx`, `unidades/page.tsx`, `usuarios/page.tsx`

**Interfaces:**
- Produces: dados `listarCanais`, `obterCanal`, `listarTaxas`, `listarCategorias(escopo)`, `listarUnidades`, `listarUsuarios`; actions `salvarCanal`, `salvarTaxas`, `excluirTaxas(id)`, `salvarCategoria`, `alternarAtivoCategoria(id)`, `salvarUnidade`, `criarUsuario`, `alterarUsuario(id, { papel?, ativo? })`.
- Convenção: toda action começa com `exigirEscrita(area)`, valida com zod, escreve com `clienteServidor()` (RLS do usuário) e termina com `revalidatePath`. Erro de unicidade do Postgres (`23505`) vira chave `duplicado`; violação de FK ao excluir (`23503`) vira `em_uso`.

- [ ] **Step 1: Dados**

`erp/src/dados/configuracoes/canais.ts`:

```ts
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";

export type CanalVigente = Database["public"]["Views"]["canais_venda_vigentes"]["Row"];
export type Canal = Database["public"]["Tables"]["canais_venda"]["Row"];
export type TaxasCanal = Database["public"]["Tables"]["canais_venda_taxas"]["Row"];

export async function listarCanais(): Promise<CanalVigente[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("canais_venda_vigentes").select("*").order("nome");
  if (error) throw error;
  return data;
}

export async function obterCanal(id: string): Promise<Canal | null> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("canais_venda").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listarTaxas(canalId: string): Promise<TaxasCanal[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("canais_venda_taxas").select("*").eq("canal_id", canalId).order("vigente_desde", { ascending: false });
  if (error) throw error;
  return data;
}
```

`erp/src/dados/configuracoes/categorias.ts`:

```ts
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";

export type Categoria = Database["public"]["Tables"]["categorias"]["Row"];
export const ESCOPOS = ["produto", "insumo", "financeiro", "conhecimento", "planejamento"] as const;
export type Escopo = (typeof ESCOPOS)[number];
export const ESCOPO_ROTULO: Record<Escopo, string> = {
  produto: "Produtos", insumo: "Insumos", financeiro: "Financeiro", conhecimento: "Conhecimento", planejamento: "Planejamento",
};

export async function listarCategorias(escopo: Escopo): Promise<Categoria[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("categorias").select("*").eq("escopo", escopo).order("ordem").order("nome");
  if (error) throw error;
  return data;
}
```

`erp/src/dados/configuracoes/unidades.ts`:

```ts
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/tipos/banco";

export type Unidade = Database["public"]["Tables"]["unidades"]["Row"];

export async function listarUnidades(): Promise<Unidade[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("unidades").select("*").order("codigo");
  if (error) throw error;
  return data;
}
```

`erp/src/dados/configuracoes/usuarios.ts`:

```ts
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import { clienteAdmin } from "@/lib/supabase/admin";
import { lerPapel, type Papel } from "@/lib/auth/papeis";

export type UsuarioLista = { id: string; nome: string; email: string; papel: Papel; ativo: boolean; criado_em: string };

/** Só o dono chama (a página exige leitura da área usuarios). E-mails vêm do Auth pela service role. */
export async function listarUsuarios(): Promise<UsuarioLista[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("usuarios_app").select("id, nome, papel, ativo, criado_em").order("nome");
  if (error) throw error;
  const { data: auth, error: erroAuth } = await clienteAdmin().auth.admin.listUsers({ perPage: 1000 });
  if (erroAuth) throw erroAuth;
  const emails = new Map(auth.users.map((u) => [u.id, u.email ?? ""]));
  return data.map((u) => ({ ...u, papel: lerPapel(u.papel) ?? "leitura", email: emails.get(u.id) ?? "" }));
}
```

- [ ] **Step 2: Actions**

`erp/src/acoes/configuracoes/canais.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { campoFracao, campoInteiro, campoValor, errosDoZod, lerCampos, textoOpcional, type EstadoForm, type ResultadoAcao } from "@/lib/forms";

export const TIPOS_CANAL = ["shopee", "mercado_livre", "tiktok_shop", "site", "direto", "outro"] as const;

const canalSchema = z.object({
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(80, { error: "nome_longo" }),
  tipo: z.enum(TIPOS_CANAL, { error: "tipo_invalido" }),
  observacoes: textoOpcional(2000),
});

export async function salvarCanal(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("configuracoes");
  const campos = lerCampos(fd, ["id", "nome", "tipo", "observacoes", "ativo"] as const);
  const r = canalSchema.safeParse(campos);
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const linha = { ...r.data, ativo: campos.id ? campos.ativo === "sim" : true };
  const { error } = campos.id
    ? await supabase.from("canais_venda").update(linha).eq("id", campos.id)
    : await supabase.from("canais_venda").insert(linha);
  if (error) return { erros: { _form: error.code === "23505" ? "duplicado" : "erro_inesperado" } };
  revalidatePath("/configuracoes/canais", "layout");
  revalidatePath("/");
  return { erros: {}, ok: true, mensagem: "Canal salvo." };
}

const taxasSchema = z.object({
  canal_id: z.uuid(),
  vigente_desde: z.iso.date({ error: "data_invalida" }),
  comissao_pct: campoFracao,
  taxa_fixa_item: campoValor,
  taxa_pagamento_pct: campoFracao,
  ads_pct_padrao: campoFracao,
  frete_subsidio_padrao: campoValor,
  dias_repasse: campoInteiro,
  observacoes: textoOpcional(1000),
});

export async function salvarTaxas(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("configuracoes");
  const campos = lerCampos(fd, [
    "canal_id", "vigente_desde", "comissao_pct", "taxa_fixa_item", "taxa_pagamento_pct", "ads_pct_padrao",
    "frete_subsidio_padrao", "dias_repasse", "observacoes",
  ] as const);
  const r = taxasSchema.safeParse(campos);
  if (!r.success) return errosDoZod(r.error);
  const supabase = await clienteServidor();
  const { error } = await supabase.from("canais_venda_taxas").insert(r.data);
  if (error) return { erros: { _form: error.code === "23505" ? "duplicado" : "erro_inesperado" } };
  revalidatePath("/configuracoes/canais", "layout");
  revalidatePath("/");
  return { erros: {}, ok: true, mensagem: "Vigência de taxas registrada." };
}

export async function excluirTaxas(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("configuracoes");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { error } = await supabase.from("canais_venda_taxas").delete().eq("id", id);
  if (error) return { ok: false, erro: "erro_inesperado" };
  revalidatePath("/configuracoes/canais", "layout");
  return { ok: true, mensagem: "Vigência removida." };
}
```

`erp/src/acoes/configuracoes/categorias.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { campoInteiro, errosDoZod, lerCampos, type EstadoForm, type ResultadoAcao } from "@/lib/forms";

const ESCOPOS = ["produto", "insumo", "financeiro", "conhecimento", "planejamento"] as const;

const schema = z.object({
  escopo: z.enum(ESCOPOS, { error: "escopo_invalido" }),
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(80, { error: "nome_longo" }),
  pai_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
  cor: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: "cor_invalida" }).nullable()),
  ordem: campoInteiro,
});

export async function salvarCategoria(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("configuracoes");
  const campos = lerCampos(fd, ["id", "escopo", "nome", "pai_id", "cor", "ordem"] as const);
  const r = schema.safeParse(campos);
  if (!r.success) return errosDoZod(r.error);
  if (campos.id && r.data.pai_id === campos.id) return { erros: { pai_id: "nao_encontrado" } };
  const supabase = await clienteServidor();
  const linha = { ...r.data, ordem: r.data.ordem ?? 0 };
  const { error } = campos.id
    ? await supabase.from("categorias").update(linha).eq("id", campos.id)
    : await supabase.from("categorias").insert(linha);
  if (error) return { erros: { _form: error.code === "23505" ? "duplicado" : "erro_inesperado" } };
  revalidatePath("/configuracoes/categorias");
  return { erros: {}, ok: true, mensagem: "Categoria salva." };
}

export async function alternarAtivoCategoria(id: string): Promise<ResultadoAcao> {
  try {
    await exigirEscrita("configuracoes");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const supabase = await clienteServidor();
  const { data } = await supabase.from("categorias").select("ativo").eq("id", id).maybeSingle();
  if (!data) return { ok: false, erro: "nao_encontrado" };
  const { error } = await supabase.from("categorias").update({ ativo: !data.ativo }).eq("id", id);
  if (error) return { ok: false, erro: "erro_inesperado" };
  revalidatePath("/configuracoes/categorias");
  return { ok: true, mensagem: data.ativo ? "Categoria inativada." : "Categoria reativada." };
}
```

`erp/src/acoes/configuracoes/unidades.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { errosDoZod, lerCampos, type EstadoForm } from "@/lib/forms";
import { lerNumeroPt } from "@/lib/formatos/numero";

const schema = z.object({
  codigo: z.string().regex(/^[a-z]{1,6}$/, { error: "codigo_invalido" }),
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(40, { error: "nome_longo" }),
  base: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^[a-z]{1,6}$/).nullable()),
  fator_para_base: z.preprocess((v) => lerNumeroPt(String(v ?? "")) ?? Number.NaN, z.number({ error: "numero_invalido" }).positive({ error: "numero_invalido" })),
});

export async function salvarUnidade(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("configuracoes");
  const campos = lerCampos(fd, ["editando", "codigo", "nome", "base", "fator_para_base"] as const);
  const r = schema.safeParse(campos);
  if (!r.success) return errosDoZod(r.error);
  if (r.data.base === r.data.codigo) return { erros: { base: "nao_encontrado" } };
  const supabase = await clienteServidor();
  const { error } =
    campos.editando === "sim"
      ? await supabase.from("unidades").update({ nome: r.data.nome, base: r.data.base, fator_para_base: r.data.fator_para_base }).eq("codigo", r.data.codigo)
      : await supabase.from("unidades").insert(r.data);
  if (error) return { erros: { _form: error.code === "23505" ? "duplicado" : error.code === "23503" ? "nao_encontrado" : "erro_inesperado" } };
  revalidatePath("/configuracoes/unidades");
  return { erros: {}, ok: true, mensagem: "Unidade salva." };
}
```

`erp/src/acoes/configuracoes/usuarios.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEscrita, usuarioAtual } from "@/lib/auth/sessao";
import { clienteServidor } from "@/lib/supabase/servidor";
import { clienteAdmin } from "@/lib/supabase/admin";
import { PAPEIS } from "@/lib/auth/papeis";
import { errosDoZod, lerCampos, type EstadoForm, type ResultadoAcao } from "@/lib/forms";

const criarSchema = z.object({
  nome: z.string().min(1, { error: "nome_obrigatorio" }).max(120, { error: "nome_longo" }),
  email: z.email({ error: "email_invalido" }),
  senha: z.string().min(10, { error: "senha_curta" }).max(200),
  papel: z.enum(PAPEIS, { error: "papel_invalido" }),
});

export async function criarUsuario(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirEscrita("usuarios");
  const r = criarSchema.safeParse(lerCampos(fd, ["nome", "email", "senha", "papel"] as const));
  if (!r.success) return errosDoZod(r.error);
  const admin = clienteAdmin();
  const { data, error } = await admin.auth.admin.createUser({ email: r.data.email, password: r.data.senha, email_confirm: true });
  if (error) return { erros: { _form: error.message.toLowerCase().includes("already") ? "duplicado" : "erro_inesperado" } };
  const supabase = await clienteServidor();
  const { error: erroLinha } = await supabase.from("usuarios_app").insert({ id: data.user.id, nome: r.data.nome, papel: r.data.papel });
  if (erroLinha) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { erros: { _form: "erro_inesperado" } };
  }
  revalidatePath("/configuracoes/usuarios");
  return { erros: {}, ok: true, mensagem: "Usuário criado." };
}

const alterarSchema = z.object({ papel: z.enum(PAPEIS).optional(), ativo: z.boolean().optional() });

export async function alterarUsuario(id: string, mudanca: { papel?: string; ativo?: boolean }): Promise<ResultadoAcao> {
  let eu;
  try {
    eu = await exigirEscrita("usuarios");
  } catch {
    return { ok: false, erro: "sem_permissao" };
  }
  if (!z.uuid().safeParse(id).success) return { ok: false, erro: "nao_encontrado" };
  const r = alterarSchema.safeParse(mudanca);
  if (!r.success) return { ok: false, erro: "papel_invalido" };
  if (id === eu.id && (r.data.ativo === false || (r.data.papel && r.data.papel !== "dono"))) {
    return { ok: false, erro: "sem_permissao" };
  }
  const supabase = await clienteServidor();
  const { error } = await supabase.from("usuarios_app").update(r.data).eq("id", id);
  if (error) return { ok: false, erro: "erro_inesperado" };
  revalidatePath("/configuracoes/usuarios");
  return { ok: true, mensagem: "Usuário atualizado." };
}

export async function meuId(): Promise<string | null> {
  return (await usuarioAtual())?.id ?? null;
}
```

- [ ] **Step 3: Formulários e tabelas de canais**

`erp/src/componentes/configuracoes/FormCanal.tsx`:

```tsx
"use client";

import { useActionState, useContext } from "react";
import { salvarCanal, TIPOS_CANAL } from "@/acoes/configuracoes/canais";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

export const TIPO_CANAL_ROTULO: Record<(typeof TIPOS_CANAL)[number], string> = {
  shopee: "Shopee", mercado_livre: "Mercado Livre", tiktok_shop: "TikTok Shop", site: "Site próprio", direto: "Venda direta", outro: "Outro",
};

type Canal = { id: string; nome: string; tipo: string; ativo: boolean; observacoes: string | null };

export function FormCanal({ canal }: { canal?: Canal }) {
  const [estado, acao, pendente] = useActionState(salvarCanal, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, canal ? undefined : fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      {canal && <input type="hidden" name="id" value={canal.id} />}
      <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
        <Input id="nome" name="nome" defaultValue={canal?.nome} required maxLength={80} />
      </Campo>
      <Campo rotulo="Tipo" nome="tipo" erro={estado.erros.tipo}>
        <SelectNativo id="tipo" name="tipo" defaultValue={canal?.tipo ?? "outro"}>
          {TIPOS_CANAL.map((t) => <option key={t} value={t}>{TIPO_CANAL_ROTULO[t]}</option>)}
        </SelectNativo>
      </Campo>
      {canal && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" value="sim" defaultChecked={canal.ativo} className="size-4 accent-acao" /> Canal ativo
        </label>
      )}
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Textarea id="observacoes" name="observacoes" defaultValue={canal?.observacoes ?? ""} rows={3} maxLength={2000} />
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>{pendente ? "Salvando" : "Salvar"}</Button>
    </form>
  );
}
```

`erp/src/componentes/configuracoes/FormTaxas.tsx`:

```tsx
"use client";

import { useActionState, useContext } from "react";
import { salvarTaxas } from "@/acoes/configuracoes/canais";
import { FORM_INICIAL } from "@/lib/forms";
import { formatarNumero } from "@/lib/formatos/numero";
import { hojeSaoPaulo } from "@/lib/formatos/data";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

type Base = {
  comissao_pct: number | null; taxa_fixa_item: number | null; taxa_pagamento_pct: number | null;
  ads_pct_padrao: number | null; frete_subsidio_padrao: number | null; dias_repasse: number | null;
} | null;

const pct = (v: number | null) => (v === null ? "" : formatarNumero(v * 100, 2));
const val = (v: number | null) => (v === null ? "" : formatarNumero(v, 2));

export function FormTaxas({ canalId, base }: { canalId: string; base: Base }) {
  const [estado, acao, pendente] = useActionState(salvarTaxas, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="canal_id" value={canalId} />
      <p className="text-sm text-texto-2">Deixe em branco o que não souber. Percentuais sobre o preço de venda, em por cento (14,5).</p>
      <Campo rotulo="Vigente desde" nome="vigente_desde" erro={estado.erros.vigente_desde}>
        <Input id="vigente_desde" name="vigente_desde" type="date" defaultValue={hojeSaoPaulo()} required />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Comissão (%)" nome="comissao_pct" erro={estado.erros.comissao_pct}>
          <Input id="comissao_pct" name="comissao_pct" inputMode="decimal" defaultValue={pct(base?.comissao_pct ?? null)} placeholder="14,00" />
        </Campo>
        <Campo rotulo="Taxa fixa por item (R$)" nome="taxa_fixa_item" erro={estado.erros.taxa_fixa_item}>
          <Input id="taxa_fixa_item" name="taxa_fixa_item" inputMode="decimal" defaultValue={val(base?.taxa_fixa_item ?? null)} placeholder="4,00" />
        </Campo>
        <Campo rotulo="Processamento (%)" nome="taxa_pagamento_pct" erro={estado.erros.taxa_pagamento_pct}>
          <Input id="taxa_pagamento_pct" name="taxa_pagamento_pct" inputMode="decimal" defaultValue={pct(base?.taxa_pagamento_pct ?? null)} />
        </Campo>
        <Campo rotulo="Ads padrão (%)" nome="ads_pct_padrao" erro={estado.erros.ads_pct_padrao}>
          <Input id="ads_pct_padrao" name="ads_pct_padrao" inputMode="decimal" defaultValue={pct(base?.ads_pct_padrao ?? null)} />
        </Campo>
        <Campo rotulo="Frete subsidiado (R$)" nome="frete_subsidio_padrao" erro={estado.erros.frete_subsidio_padrao}>
          <Input id="frete_subsidio_padrao" name="frete_subsidio_padrao" inputMode="decimal" defaultValue={val(base?.frete_subsidio_padrao ?? null)} />
        </Campo>
        <Campo rotulo="Dias até o repasse" nome="dias_repasse" erro={estado.erros.dias_repasse}>
          <Input id="dias_repasse" name="dias_repasse" inputMode="numeric" defaultValue={base?.dias_repasse ?? ""} />
        </Campo>
      </div>
      <Campo rotulo="Observações" nome="observacoes" erro={estado.erros.observacoes}>
        <Textarea id="observacoes" name="observacoes" rows={2} maxLength={1000} />
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>{pendente ? "Salvando" : "Registrar vigência"}</Button>
    </form>
  );
}
```

`erp/src/componentes/configuracoes/TabelaCanais.tsx`:

```tsx
"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { CanalVigente } from "@/dados/configuracoes/canais";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { formatarData } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import { TabelaDados } from "@/componentes/painel/TabelaDados";
import { TIPO_CANAL_ROTULO } from "./FormCanal";

const colunas: ColumnDef<CanalVigente, unknown>[] = [
  {
    accessorKey: "nome", header: "Canal",
    cell: ({ row }) => <Link href={`/configuracoes/canais/${row.original.id}`} className="font-medium text-acao hover:underline">{row.original.nome}</Link>,
  },
  { accessorKey: "tipo", header: "Tipo", cell: ({ getValue }) => TIPO_CANAL_ROTULO[getValue() as keyof typeof TIPO_CANAL_ROTULO] ?? String(getValue()) },
  { accessorKey: "comissao_pct", header: "Comissão", cell: ({ getValue }) => <span className="numeros">{formatarPercentual(getValue() as number | null)}</span> },
  { accessorKey: "taxa_fixa_item", header: "Taxa fixa", cell: ({ getValue }) => <span className="numeros">{getValue() == null ? "Não configurado" : formatarMoeda(getValue() as number)}</span> },
  { accessorKey: "vigente_desde", header: "Vigente desde", cell: ({ getValue }) => formatarData(getValue() as string | null) || "Sem vigência" },
  { accessorKey: "ativo", header: "Situação", cell: ({ getValue }) => <Badge variant={getValue() ? "default" : "secondary"}>{getValue() ? "Ativo" : "Inativo"}</Badge> },
];

export function TabelaCanais({ canais }: { canais: CanalVigente[] }) {
  return (
    <TabelaDados
      colunas={colunas}
      dados={canais}
      placeholderFiltro="Filtrar canais"
      vazio={{ titulo: "Nenhum canal cadastrado", descricao: "Cadastre os marketplaces e canais onde você vende." }}
      idLinha={(c) => c.id ?? ""}
    />
  );
}
```

`erp/src/app/(painel)/configuracoes/canais/page.tsx`:

```tsx
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarCanais } from "@/dados/configuracoes/canais";
import { TabelaCanais } from "@/componentes/configuracoes/TabelaCanais";
import { FormCanal } from "@/componentes/configuracoes/FormCanal";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Canais de venda" };

export default async function PaginaCanais({ searchParams }: { searchParams: Promise<{ novo?: string }> }) {
  const usuario = await exigirLeitura("configuracoes");
  const { novo } = await searchParams;
  const canais = await listarCanais();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold uppercase">Canais de venda</h1>
          <p className="text-sm text-texto-2">Taxa em branco significa não configurado. Confira os valores na central de cada canal.</p>
        </div>
        {podeEscrever(usuario.papel, "configuracoes") && (
          <DialogoNovo rotulo="Novo canal" titulo="Novo canal" abrirInicial={novo === "1"}><FormCanal /></DialogoNovo>
        )}
      </div>
      <TabelaCanais canais={canais} />
    </div>
  );
}
```

`erp/src/app/(painel)/configuracoes/canais/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarTaxas, obterCanal } from "@/dados/configuracoes/canais";
import { excluirTaxas } from "@/acoes/configuracoes/canais";
import { formatarMoeda, formatarPercentual } from "@/lib/formatos/moeda";
import { formatarData } from "@/lib/formatos/data";
import { FormCanal } from "@/componentes/configuracoes/FormCanal";
import { FormTaxas } from "@/componentes/configuracoes/FormTaxas";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { EstadoVazio } from "@/componentes/painel/EstadoVazio";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/componentes/ui/table";

export default async function PaginaCanal({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirLeitura("configuracoes");
  const { id } = await params;
  const canal = await obterCanal(id);
  if (!canal) notFound();
  const taxas = await listarTaxas(id);
  const editar = podeEscrever(usuario.papel, "configuracoes");
  const vigente = taxas.find((t) => t.vigente_desde <= new Date().toISOString().slice(0, 10)) ?? null;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section className="space-y-4 rounded-md border border-borda bg-superficie p-4">
        <h1 className="text-2xl font-bold uppercase">{canal.nome}</h1>
        {editar ? <FormCanal canal={canal} /> : <p className="text-sm text-texto-2">Somente leitura.</p>}
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase">Taxas por vigência</h2>
          {editar && (
            <DialogoNovo rotulo="Nova vigência" titulo="Nova vigência de taxas">
              <FormTaxas canalId={canal.id} base={vigente} />
            </DialogoNovo>
          )}
        </div>
        {taxas.length === 0 ? (
          <EstadoVazio titulo="Nenhuma taxa registrada" descricao="Sem taxas, a calculadora de preço (Fase 4) não consegue sugerir preço para este canal." />
        ) : (
          <div className="overflow-x-auto rounded-md border border-borda">
            <Table>
              <TableHeader>
                <TableRow className="bg-superficie-2">
                  <TableHead>Desde</TableHead><TableHead>Comissão</TableHead><TableHead>Fixa</TableHead>
                  <TableHead>Pagamento</TableHead><TableHead>Ads</TableHead><TableHead>Frete</TableHead><TableHead>Repasse</TableHead>
                  {editar && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxas.map((t) => (
                  <TableRow key={t.id} className="numeros">
                    <TableCell>{formatarData(t.vigente_desde)}</TableCell>
                    <TableCell>{formatarPercentual(t.comissao_pct)}</TableCell>
                    <TableCell>{t.taxa_fixa_item == null ? "Não configurado" : formatarMoeda(t.taxa_fixa_item)}</TableCell>
                    <TableCell>{formatarPercentual(t.taxa_pagamento_pct)}</TableCell>
                    <TableCell>{formatarPercentual(t.ads_pct_padrao)}</TableCell>
                    <TableCell>{t.frete_subsidio_padrao == null ? "Não configurado" : formatarMoeda(t.frete_subsidio_padrao)}</TableCell>
                    <TableCell>{t.dias_repasse == null ? "Não configurado" : `${t.dias_repasse} dias`}</TableCell>
                    {editar && (
                      <TableCell className="text-right">
                        <BotaoAcao acao={excluirTaxas.bind(null, t.id)} confirmar={{ titulo: "Remover esta vigência?", descricao: "Cálculos salvos que a usaram continuam com o snapshot próprio." }}>
                          Remover
                        </BotaoAcao>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Categorias**

`erp/src/componentes/configuracoes/FormCategoria.tsx`:

```tsx
"use client";

import { useActionState, useContext } from "react";
import { salvarCategoria } from "@/acoes/configuracoes/categorias";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

export type CategoriaForm = { id: string; nome: string; pai_id: string | null; cor: string | null; ordem: number };

export function FormCategoria({ escopo, categoria, opcoesPai }: { escopo: string; categoria?: CategoriaForm; opcoesPai: { id: string; nome: string }[] }) {
  const [estado, acao, pendente] = useActionState(salvarCategoria, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="escopo" value={escopo} />
      {categoria && <input type="hidden" name="id" value={categoria.id} />}
      <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
        <Input id="nome" name="nome" defaultValue={categoria?.nome} required maxLength={80} />
      </Campo>
      <Campo rotulo="Categoria pai" nome="pai_id" erro={estado.erros.pai_id}>
        <SelectNativo id="pai_id" name="pai_id" defaultValue={categoria?.pai_id ?? ""}>
          <option value="">Nenhuma</option>
          {opcoesPai.filter((o) => o.id !== categoria?.id).map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </SelectNativo>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Cor" nome="cor" erro={estado.erros.cor} dica="Opcional, hexadecimal">
          <Input id="cor" name="cor" defaultValue={categoria?.cor ?? ""} placeholder="#00D8FF" maxLength={7} />
        </Campo>
        <Campo rotulo="Ordem" nome="ordem" erro={estado.erros.ordem}>
          <Input id="ordem" name="ordem" inputMode="numeric" defaultValue={categoria?.ordem ?? 0} />
        </Campo>
      </div>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>{pendente ? "Salvando" : "Salvar"}</Button>
    </form>
  );
}
```

`erp/src/componentes/configuracoes/TabelaCategorias.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Categoria } from "@/dados/configuracoes/categorias";
import { alternarAtivoCategoria } from "@/acoes/configuracoes/categorias";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { TabelaDados } from "@/componentes/painel/TabelaDados";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { FormCategoria } from "./FormCategoria";

export function TabelaCategorias({ categorias, escopo, editar, destaque }: { categorias: Categoria[]; escopo: string; editar: boolean; destaque?: string }) {
  const [editando, setEditando] = useState<Categoria | null>(null);
  const nomes = new Map(categorias.map((c) => [c.id, c.nome]));
  const colunas: ColumnDef<Categoria, unknown>[] = [
    { accessorKey: "nome", header: "Nome", cell: ({ row }) => <span className="font-medium">{row.original.nome}</span> },
    { accessorKey: "pai_id", header: "Pai", cell: ({ getValue }) => nomes.get(getValue() as string) ?? "" },
    {
      accessorKey: "cor", header: "Cor", enableSorting: false,
      cell: ({ getValue }) => getValue() ? <span className="inline-flex items-center gap-2"><span className="size-3 rounded-sm border border-borda" style={{ background: String(getValue()) }} /><span className="font-mono text-xs">{String(getValue())}</span></span> : "",
    },
    { accessorKey: "ordem", header: "Ordem", cell: ({ getValue }) => <span className="numeros">{String(getValue())}</span> },
    { accessorKey: "ativo", header: "Situação", cell: ({ getValue }) => <Badge variant={getValue() ? "default" : "secondary"}>{getValue() ? "Ativa" : "Inativa"}</Badge> },
  ];
  if (editar) {
    colunas.push({
      id: "acoes", header: "", enableSorting: false,
      cell: ({ row }) => (
        <span className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditando(row.original)}>Editar</Button>
          <BotaoAcao acao={() => alternarAtivoCategoria(row.original.id)}>{row.original.ativo ? "Inativar" : "Reativar"}</BotaoAcao>
        </span>
      ),
    });
  }
  return (
    <>
      <TabelaDados
        colunas={colunas}
        dados={categorias}
        placeholderFiltro="Filtrar categorias"
        vazio={{ titulo: "Nenhuma categoria neste escopo", descricao: "Crie a primeira com o botão Nova categoria." }}
        idLinha={(c) => c.id}
        destaque={destaque}
      />
      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar categoria</DialogTitle></DialogHeader>
          {editando && (
            <ContextoDialogo.Provider value={() => setEditando(null)}>
              <FormCategoria escopo={escopo} categoria={editando} opcoesPai={categorias.map((c) => ({ id: c.id, nome: c.nome }))} />
            </ContextoDialogo.Provider>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

`erp/src/app/(painel)/configuracoes/categorias/page.tsx`:

```tsx
import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { ESCOPO_ROTULO, ESCOPOS, listarCategorias, type Escopo } from "@/dados/configuracoes/categorias";
import { TabelaCategorias } from "@/componentes/configuracoes/TabelaCategorias";
import { FormCategoria } from "@/componentes/configuracoes/FormCategoria";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";
import { cn } from "@/lib/utils";

export const metadata = { title: "Categorias" };

export default async function PaginaCategorias({ searchParams }: { searchParams: Promise<{ escopo?: string; novo?: string; destaque?: string }> }) {
  const usuario = await exigirLeitura("configuracoes");
  const sp = await searchParams;
  const escopo: Escopo = ESCOPOS.includes(sp.escopo as Escopo) ? (sp.escopo as Escopo) : "produto";
  const categorias = await listarCategorias(escopo);
  const editar = podeEscrever(usuario.papel, "configuracoes");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h1 className="text-2xl font-bold uppercase">Categorias</h1>
        {editar && (
          <DialogoNovo rotulo="Nova categoria" titulo={`Nova categoria em ${ESCOPO_ROTULO[escopo]}`} abrirInicial={sp.novo === "1"}>
            <FormCategoria escopo={escopo} opcoesPai={categorias.map((c) => ({ id: c.id, nome: c.nome }))} />
          </DialogoNovo>
        )}
      </div>
      <nav aria-label="Escopo" className="flex flex-wrap gap-1 border-b border-borda">
        {ESCOPOS.map((e) => (
          <Link key={e} href={`/configuracoes/categorias?escopo=${e}`} aria-current={e === escopo ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm", e === escopo ? "border-acao text-texto" : "border-transparent text-texto-2 hover:text-texto")}>
            {ESCOPO_ROTULO[e]}
          </Link>
        ))}
      </nav>
      <TabelaCategorias categorias={categorias} escopo={escopo} editar={editar} destaque={sp.destaque} />
    </div>
  );
}
```

- [ ] **Step 5: Unidades**

`erp/src/componentes/configuracoes/FormUnidade.tsx`:

```tsx
"use client";

import { useActionState, useContext } from "react";
import { salvarUnidade } from "@/acoes/configuracoes/unidades";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

type Unidade = { codigo: string; nome: string; base: string | null; fator_para_base: number };

export function FormUnidade({ unidade, bases }: { unidade?: Unidade; bases: string[] }) {
  const [estado, acao, pendente] = useActionState(salvarUnidade, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      {unidade && <input type="hidden" name="editando" value="sim" />}
      <Campo rotulo="Código" nome="codigo" erro={estado.erros.codigo} dica="Minúsculas, até 6 letras (g, kg, un)">
        <Input id="codigo" name="codigo" defaultValue={unidade?.codigo} readOnly={!!unidade} maxLength={6} required />
      </Campo>
      <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}>
        <Input id="nome" name="nome" defaultValue={unidade?.nome} maxLength={40} required />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Unidade base" nome="base" erro={estado.erros.base}>
          <SelectNativo id="base" name="base" defaultValue={unidade?.base ?? ""}>
            <option value="">É base</option>
            {bases.filter((b) => b !== unidade?.codigo).map((b) => <option key={b} value={b}>{b}</option>)}
          </SelectNativo>
        </Campo>
        <Campo rotulo="Fator para a base" nome="fator_para_base" erro={estado.erros.fator_para_base} dica="1 kg = 1000 g, então fator 1000">
          <Input id="fator_para_base" name="fator_para_base" inputMode="decimal" defaultValue={unidade?.fator_para_base ?? 1} />
        </Campo>
      </div>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>{pendente ? "Salvando" : "Salvar"}</Button>
    </form>
  );
}
```

`erp/src/componentes/configuracoes/TabelaUnidades.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Unidade } from "@/dados/configuracoes/unidades";
import { formatarNumero } from "@/lib/formatos/numero";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { TabelaDados } from "@/componentes/painel/TabelaDados";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { FormUnidade } from "./FormUnidade";

export function TabelaUnidades({ unidades, editar, destaque }: { unidades: Unidade[]; editar: boolean; destaque?: string }) {
  const [editando, setEditando] = useState<Unidade | null>(null);
  const colunas: ColumnDef<Unidade, unknown>[] = [
    { accessorKey: "codigo", header: "Código", cell: ({ getValue }) => <span className="font-mono">{String(getValue())}</span> },
    { accessorKey: "nome", header: "Nome" },
    { accessorKey: "base", header: "Base", cell: ({ getValue }) => (getValue() ? <span className="font-mono">{String(getValue())}</span> : "É base") },
    { accessorKey: "fator_para_base", header: "Fator", cell: ({ getValue }) => <span className="numeros">{formatarNumero(getValue() as number, 6).replace(/,?0+$/, "")}</span> },
  ];
  if (editar) {
    colunas.push({ id: "acoes", header: "", enableSorting: false, cell: ({ row }) => <span className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => setEditando(row.original)}>Editar</Button></span> });
  }
  return (
    <>
      <TabelaDados colunas={colunas} dados={unidades} placeholderFiltro="Filtrar unidades" vazio={{ titulo: "Nenhuma unidade" }} idLinha={(u) => u.codigo} destaque={destaque} />
      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar unidade</DialogTitle></DialogHeader>
          {editando && (
            <ContextoDialogo.Provider value={() => setEditando(null)}>
              <FormUnidade unidade={editando} bases={unidades.map((u) => u.codigo)} />
            </ContextoDialogo.Provider>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

`erp/src/app/(painel)/configuracoes/unidades/page.tsx`:

```tsx
import { exigirLeitura } from "@/lib/auth/sessao";
import { podeEscrever } from "@/lib/auth/papeis";
import { listarUnidades } from "@/dados/configuracoes/unidades";
import { TabelaUnidades } from "@/componentes/configuracoes/TabelaUnidades";
import { FormUnidade } from "@/componentes/configuracoes/FormUnidade";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Unidades" };

export default async function PaginaUnidades({ searchParams }: { searchParams: Promise<{ destaque?: string }> }) {
  const usuario = await exigirLeitura("configuracoes");
  const { destaque } = await searchParams;
  const unidades = await listarUnidades();
  const editar = podeEscrever(usuario.papel, "configuracoes");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold uppercase">Unidades</h1>
          <p className="text-sm text-texto-2">Toda quantidade no sistema carrega uma unidade; o fator converte para a base (kg para g, h para min).</p>
        </div>
        {editar && <DialogoNovo rotulo="Nova unidade" titulo="Nova unidade"><FormUnidade bases={unidades.map((u) => u.codigo)} /></DialogoNovo>}
      </div>
      <TabelaUnidades unidades={unidades} editar={editar} destaque={destaque} />
    </div>
  );
}
```

- [ ] **Step 6: Usuários**

`erp/src/componentes/configuracoes/FormUsuario.tsx`:

```tsx
"use client";

import { useActionState, useContext } from "react";
import { criarUsuario } from "@/acoes/configuracoes/usuarios";
import { PAPEIS, PAPEL_ROTULO } from "@/lib/auth/papeis";
import { FORM_INICIAL } from "@/lib/forms";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Campo } from "@/componentes/painel/Campo";
import { CampoErro } from "@/componentes/painel/CampoErro";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { ContextoDialogo } from "@/componentes/painel/DialogoNovo";
import { useAoSalvar } from "@/componentes/painel/useAoSalvar";

export function FormUsuario() {
  const [estado, acao, pendente] = useActionState(criarUsuario, FORM_INICIAL);
  const fechar = useContext(ContextoDialogo);
  useAoSalvar(estado, fechar);
  return (
    <form action={acao} className="space-y-4" noValidate>
      <Campo rotulo="Nome" nome="nome" erro={estado.erros.nome}><Input id="nome" name="nome" required maxLength={120} /></Campo>
      <Campo rotulo="E-mail" nome="email" erro={estado.erros.email}><Input id="email" name="email" type="email" required /></Campo>
      <Campo rotulo="Senha inicial" nome="senha" erro={estado.erros.senha} dica="Pelo menos 10 caracteres. Combine a troca na primeira entrada.">
        <Input id="senha" name="senha" type="password" autoComplete="new-password" required minLength={10} />
      </Campo>
      <Campo rotulo="Papel" nome="papel" erro={estado.erros.papel}>
        <SelectNativo id="papel" name="papel" defaultValue="leitura">
          {PAPEIS.map((p) => <option key={p} value={p}>{PAPEL_ROTULO[p]}</option>)}
        </SelectNativo>
      </Campo>
      <CampoErro chave={estado.erros._form} />
      <Button type="submit" disabled={pendente}>{pendente ? "Criando" : "Criar usuário"}</Button>
    </form>
  );
}
```

`erp/src/componentes/configuracoes/TabelaUsuarios.tsx`:

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { UsuarioLista } from "@/dados/configuracoes/usuarios";
import { alterarUsuario } from "@/acoes/configuracoes/usuarios";
import { PAPEIS, PAPEL_ROTULO } from "@/lib/auth/papeis";
import { formatarData } from "@/lib/formatos/data";
import { Badge } from "@/componentes/ui/badge";
import { TabelaDados } from "@/componentes/painel/TabelaDados";
import { BotaoAcao } from "@/componentes/painel/BotaoAcao";
import { SelectNativo } from "@/componentes/painel/SelectNativo";
import { toast } from "sonner";
import { erroPt } from "@/lib/erros-pt";

export function TabelaUsuarios({ usuarios, meuId }: { usuarios: UsuarioLista[]; meuId: string }) {
  const colunas: ColumnDef<UsuarioLista, unknown>[] = [
    { accessorKey: "nome", header: "Nome", cell: ({ row }) => <span className="font-medium">{row.original.nome}{row.original.id === meuId && <span className="ml-2 text-xs text-texto-3">(você)</span>}</span> },
    { accessorKey: "email", header: "E-mail" },
    {
      accessorKey: "papel", header: "Papel", enableSorting: false,
      cell: ({ row }) => (
        <SelectNativo
          aria-label={`Papel de ${row.original.nome}`}
          className="h-8 w-36"
          defaultValue={row.original.papel}
          disabled={row.original.id === meuId}
          onChange={async (e) => {
            const r = await alterarUsuario(row.original.id, { papel: e.target.value });
            if (r.ok) toast.success(r.mensagem); else toast.error(erroPt(r.erro));
          }}
        >
          {PAPEIS.map((p) => <option key={p} value={p}>{PAPEL_ROTULO[p]}</option>)}
        </SelectNativo>
      ),
    },
    { accessorKey: "criado_em", header: "Desde", cell: ({ getValue }) => formatarData(getValue() as string) },
    { accessorKey: "ativo", header: "Situação", cell: ({ getValue }) => <Badge variant={getValue() ? "default" : "secondary"}>{getValue() ? "Ativo" : "Inativo"}</Badge> },
    {
      id: "acoes", header: "", enableSorting: false,
      cell: ({ row }) => row.original.id === meuId ? null : (
        <span className="flex justify-end">
          <BotaoAcao
            acao={() => alterarUsuario(row.original.id, { ativo: !row.original.ativo })}
            confirmar={row.original.ativo ? { titulo: `Desativar ${row.original.nome}?`, descricao: "A pessoa perde o acesso na hora. Pode ser reativada depois." } : undefined}
          >
            {row.original.ativo ? "Desativar" : "Reativar"}
          </BotaoAcao>
        </span>
      ),
    },
  ];
  return <TabelaDados colunas={colunas} dados={usuarios} placeholderFiltro="Filtrar usuários" vazio={{ titulo: "Nenhum usuário" }} />;
}
```

`erp/src/app/(painel)/configuracoes/usuarios/page.tsx`:

```tsx
import { exigirLeitura } from "@/lib/auth/sessao";
import { listarUsuarios } from "@/dados/configuracoes/usuarios";
import { TabelaUsuarios } from "@/componentes/configuracoes/TabelaUsuarios";
import { FormUsuario } from "@/componentes/configuracoes/FormUsuario";
import { DialogoNovo } from "@/componentes/painel/DialogoNovo";

export const metadata = { title: "Usuários" };

export default async function PaginaUsuarios() {
  const usuario = await exigirLeitura("usuarios");
  const usuarios = await listarUsuarios();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold uppercase">Usuários</h1>
          <p className="text-sm text-texto-2">Dono faz tudo. Operador cuida da operação sem ver o financeiro. Leitura só consulta.</p>
        </div>
        <DialogoNovo rotulo="Novo usuário" titulo="Novo usuário"><FormUsuario /></DialogoNovo>
      </div>
      <TabelaUsuarios usuarios={usuarios} meuId={usuario.id} />
    </div>
  );
}
```

- [ ] **Step 7: Conferir e commitar**

```bash
cd erp && npm run lint && npm run typecheck && npm test && npm run build
```

Manual (`npm run dev`): criar canal "Teste", abrir, registrar vigência com comissão "14,5" e taxa fixa "4,00", conferir "14,5 %" e "R$ 4,00" na lista; nome duplicado mostra "Já existe um registro com esse valor."; categoria nova em Produtos aparece e a busca Ctrl+K encontra e destaca a linha; unidade "cx" criada; usuário novo de leitura criado, logar com ele em janela anônima: menu sem Usuários, botão Novo oculto, `/configuracoes/usuarios` redireciona para `/sem-acesso?area=usuarios`.

```bash
git add erp
git commit -m "erp: telas de configuracao de canais, categorias, unidades e usuarios"
```

---

### Task 13: Dashboard inicial honesto

**Files:**
- Create: `erp/src/dados/dashboard.ts`, `erp/src/dominio/README.md`
- Modify: `erp/src/app/(painel)/page.tsx`

**Interfaces:**
- Produces: `resumoInicial()` devolvendo `{ alertasAbertos, canaisTotal, canaisComTaxas }`. Cada fase seguinte acrescenta um campo e troca o `valor={null}` do cartão correspondente por dado real.

- [ ] **Step 1: Dados**

`erp/src/dados/dashboard.ts`:

```ts
import "server-only";
import { clienteServidor } from "@/lib/supabase/servidor";
import { contarAlertasAbertos } from "./alertas";

export type ResumoInicial = { alertasAbertos: number; canaisTotal: number; canaisComTaxas: number };

export async function resumoInicial(): Promise<ResumoInicial> {
  const supabase = await clienteServidor();
  const [{ data: canais }, alertasAbertos] = await Promise.all([
    supabase.from("canais_venda_vigentes").select("id, comissao_pct").eq("ativo", true),
    contarAlertasAbertos(),
  ]);
  const lista = canais ?? [];
  return { alertasAbertos, canaisTotal: lista.length, canaisComTaxas: lista.filter((c) => c.comissao_pct !== null).length };
}
```

`erp/src/dominio/README.md`:

```markdown
# Domínio

Regras de negócio puras: custos, preços, estoque, financeiro, planejamento. Sem React, Next ou Supabase (o lint bloqueia). Cada função recebe valores simples e devolve valores simples; a camada `acoes/` traduz entre banco e domínio. Toda fórmula tem teste ao lado e está documentada em `docs/formulas-de-custo.md` ou `docs/regras-de-negocio.md`. Nesta fase a pasta está vazia de propósito: as regras chegam a partir da Fase 3.
```

- [ ] **Step 2: Página**

`erp/src/app/(painel)/page.tsx`:

```tsx
import Link from "next/link";
import { exigirLeitura } from "@/lib/auth/sessao";
import { resumoInicial } from "@/dados/dashboard";
import { CartaoIndicador } from "@/componentes/painel/CartaoIndicador";
import { SeletorPeriodo, lerPeriodo } from "@/componentes/painel/SeletorPeriodo";
import { Banner } from "@/componentes/painel/Banner";
import { Button } from "@/componentes/ui/button";

export const metadata = { title: "Início" };

const FUTUROS: { rotulo: string; fase: number }[] = [
  { rotulo: "Faturamento do período", fase: 6 },
  { rotulo: "Receita recebida", fase: 7 },
  { rotulo: "Despesas pagas", fase: 7 },
  { rotulo: "A pagar e a receber", fase: 7 },
  { rotulo: "Pedidos em produção", fase: 5 },
  { rotulo: "Materiais abaixo do mínimo", fase: 3 },
  { rotulo: "Consumo de filamento", fase: 3 },
  { rotulo: "Próximas tarefas e publicações", fase: 8 },
];

export default async function PaginaInicio({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  await exigirLeitura("inicio");
  const { periodo } = await searchParams;
  const atual = lerPeriodo(periodo);
  const resumo = await resumoInicial();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold uppercase">Início</h1>
        <SeletorPeriodo atual={atual} base="/" />
      </div>
      {resumo.canaisComTaxas < resumo.canaisTotal && (
        <Banner
          tipo="alerta"
          titulo="Canais sem taxas configuradas"
          acao={<Button asChild size="sm" variant="outline"><Link href="/configuracoes/canais">Configurar</Link></Button>}
        >
          {resumo.canaisTotal - resumo.canaisComTaxas} de {resumo.canaisTotal} canais ativos ainda não têm comissão registrada. Sem isso a precificação (Fase 4) não calcula.
        </Banner>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoIndicador rotulo="Alertas abertos" valor={String(resumo.alertasAbertos)} rodape={<span className="text-xs text-texto-3">Central de alertas chega na Fase 9</span>} />
        <CartaoIndicador rotulo="Canais com taxas" valor={`${resumo.canaisComTaxas} de ${resumo.canaisTotal}`} />
        {FUTUROS.map((f) => (
          <CartaoIndicador key={f.rotulo} rotulo={f.rotulo} valor={null} dica={`Disponível na Fase ${f.fase}`} />
        ))}
      </div>
      <p className="text-xs text-texto-3">O período selecionado ({atual}) passa a valer quando os indicadores de vendas e financeiro existirem. Nenhum número aqui é estimativa.</p>
    </div>
  );
}
```

- [ ] **Step 3: Conferir e commitar**

```bash
cd erp && npm run lint && npm run typecheck && npm run build
git add erp
git commit -m "erp: dashboard inicial com dados reais e cartoes sem dados"
```

---

### Task 14: Testes de integração (RLS, auditoria, busca), e2e e CI

**Files:**
- Create: `erp/vitest.integracao.config.ts`, `erp/testes/integracao/setup-global.ts`, `erp/testes/integracao/ambiente.ts`, `rls.test.ts`, `auditoria.test.ts`, `busca.test.ts`, `erp/playwright.config.ts`, `erp/testes/e2e/apoio.ts`, `login.spec.ts`, `navegacao.spec.ts`, `configuracoes.spec.ts`, `responsivo.spec.ts`, `.github/workflows/ci.yml`

**Interfaces:**
- Integração usa só `SUPABASE_TESTE_*` do `.env` da raiz e se recusa a rodar se o ref for igual ao de dev. E2E usa `E2E_EMAIL` e `E2E_SENHA` de `erp/.env.local` (usuário dono criado no dev com `criar-usuario.mjs`) e `http://localhost:3000`.

- [ ] **Step 1: Configuração e ambiente de integração**

`erp/vitest.integracao.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["testes/integracao/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    globalSetup: ["testes/integracao/setup-global.ts"],
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
```

`erp/testes/integracao/setup-global.ts`:

```ts
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export default function setup() {
  const raiz = resolve(process.cwd(), "..", ".env");
  if (existsSync(raiz)) process.loadEnvFile(raiz);
  const ref = process.env.SUPABASE_TESTE_PROJECT_REF;
  if (!ref) throw new Error("SUPABASE_TESTE_PROJECT_REF ausente: rode node ferramentas/projeto-teste.mjs criar");
  if (ref === process.env.SUPABASE_PROJECT_REF) throw new Error("Projeto de teste igual ao de dev. Abortando.");
  for (const n of ["SUPABASE_TESTE_URL", "SUPABASE_TESTE_ANON_KEY", "SUPABASE_TESTE_SERVICE_ROLE_KEY"]) {
    if (!process.env[n]) throw new Error(`${n} ausente`);
  }
}
```

`erp/testes/integracao/ambiente.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/tipos/banco";

const URL = () => process.env.SUPABASE_TESTE_URL!;
const ANON = () => process.env.SUPABASE_TESTE_ANON_KEY!;
const SERVICO = () => process.env.SUPABASE_TESTE_SERVICE_ROLE_KEY!;

export type Cliente = SupabaseClient<Database>;

export function admin(): Cliente {
  return createClient<Database>(URL(), SERVICO(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-origem": "script" } },
  });
}

export function anonimo(): Cliente {
  return createClient<Database>(URL(), ANON(), { auth: { persistSession: false, autoRefreshToken: false } });
}

export type UsuarioTeste = { id: string; email: string; cliente: Cliente; remover: () => Promise<void> };

/** Cria usuário no Auth e em usuarios_app (ou só no Auth, se papel = null) e devolve um cliente logado. */
export async function criarUsuarioTeste(papel: "dono" | "operador" | "leitura" | null): Promise<UsuarioTeste> {
  const a = admin();
  const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `teste-${papel ?? "sem-papel"}-${sufixo}@exemplo.com`;
  const senha = `Senha-${sufixo}-forte`;
  const { data, error } = await a.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error) throw error;
  if (papel) {
    const { error: e } = await a.from("usuarios_app").insert({ id: data.user.id, nome: `Teste ${papel}`, papel });
    if (e) throw e;
  }
  const login = anonimo();
  const { data: sessao, error: erroLogin } = await login.auth.signInWithPassword({ email, password: senha });
  if (erroLogin || !sessao.session) throw erroLogin ?? new Error("sem sessao");
  const cliente = createClient<Database>(URL(), ANON(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${sessao.session.access_token}`, "x-origem": "web" } },
  });
  return { id: data.user.id, email, cliente, remover: async () => { await a.auth.admin.deleteUser(data.user.id); } };
}

export async function garantirMigracoes() {
  const { data, error } = await admin().from("migracoes_aplicadas").select("nome");
  if (error) throw new Error(`banco de teste sem migracoes: rode npm run migrar -- --alvo teste (${error.message})`);
  if (!data.some((m) => m.nome.startsWith("0004_"))) throw new Error("rode npm run migrar -- --alvo teste");
}
```

- [ ] **Step 2: Testes de integração**

`erp/testes/integracao/rls.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anonimo, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

let dono: UsuarioTeste;
let leitura: UsuarioTeste;
let semPapel: UsuarioTeste;

beforeAll(async () => {
  await garantirMigracoes();
  [dono, leitura, semPapel] = await Promise.all([criarUsuarioTeste("dono"), criarUsuarioTeste("leitura"), criarUsuarioTeste(null)]);
});
afterAll(async () => {
  await Promise.all([dono?.remover(), leitura?.remover(), semPapel?.remover()]);
});

describe("RLS", () => {
  it("leitura vê canais mas não grava categoria", async () => {
    const { data } = await leitura.cliente.from("canais_venda").select("nome");
    expect(data?.length).toBeGreaterThan(0);
    const { error } = await leitura.cliente.from("categorias").insert({ escopo: "produto", nome: `rls-${Date.now()}` });
    expect(error?.code).toBe("42501");
  });

  it("dono grava categoria e lê auditoria; leitura não lê auditoria", async () => {
    const nome = `rls-dono-${Date.now()}`;
    const { data, error } = await dono.cliente.from("categorias").insert({ escopo: "produto", nome }).select("id").single();
    expect(error).toBeNull();
    const { data: aud } = await dono.cliente.from("auditoria").select("acao").eq("registro_id", data!.id);
    expect(aud?.map((a) => a.acao)).toEqual(["insert"]);
    const { data: audLeitura } = await leitura.cliente.from("auditoria").select("id").eq("registro_id", data!.id);
    expect(audLeitura).toEqual([]);
    await admin().from("categorias").delete().eq("id", data!.id);
  });

  it("anônimo e usuário sem papel não leem nada", async () => {
    const { data: a } = await anonimo().from("canais_venda").select("id");
    expect(a).toEqual([]);
    const { data: b } = await semPapel.cliente.from("canais_venda").select("id");
    expect(b).toEqual([]);
  });

  it("leitura não altera o próprio papel", async () => {
    const { error } = await leitura.cliente.from("usuarios_app").update({ papel: "dono" }).eq("id", leitura.id);
    const { data } = await admin().from("usuarios_app").select("papel").eq("id", leitura.id).single();
    expect(error === null || error.code === "42501").toBe(true);
    expect(data?.papel).toBe("leitura");
  });
});
```

`erp/testes/integracao/auditoria.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

let dono: UsuarioTeste;
beforeAll(async () => {
  await garantirMigracoes();
  dono = await criarUsuarioTeste("dono");
});
afterAll(async () => dono?.remover());

describe("auditoria", () => {
  it("registra insert e update com origem web, usuário e antes/depois", async () => {
    const nome = `aud-${Date.now()}`;
    const { data: criada } = await dono.cliente.from("categorias").insert({ escopo: "insumo", nome }).select("id").single();
    await dono.cliente.from("categorias").update({ nome: `${nome}-2` }).eq("id", criada!.id);
    const { data: linhas } = await dono.cliente.from("auditoria").select("acao, origem, usuario_id, antes, depois").eq("registro_id", criada!.id).order("id");
    expect(linhas?.length).toBe(2);
    expect(linhas![0]).toMatchObject({ acao: "insert", origem: "web", usuario_id: dono.id, antes: null });
    expect((linhas![0].depois as { nome: string }).nome).toBe(nome);
    expect(linhas![1].acao).toBe("update");
    expect((linhas![1].antes as { nome: string }).nome).toBe(nome);
    expect((linhas![1].depois as { nome: string }).nome).toBe(`${nome}-2`);
    await admin().from("categorias").delete().eq("id", criada!.id);
  });

  it("escrita pela service role sem cabeçalho de origem registra script", async () => {
    const a = createSemOrigem();
    const nome = `aud-script-${Date.now()}`;
    const { data } = await a.from("categorias").insert({ escopo: "insumo", nome }).select("id").single();
    const { data: linhas } = await a.from("auditoria").select("origem, usuario_id").eq("registro_id", data!.id);
    expect(linhas![0]).toMatchObject({ origem: "web", usuario_id: null });
    await a.from("categorias").delete().eq("id", data!.id);
  });
});

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/tipos/banco";
function createSemOrigem() {
  return createClient<Database>(process.env.SUPABASE_TESTE_URL!, process.env.SUPABASE_TESTE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

Observação sobre o segundo teste: pela API HTTP sempre há cabeçalhos, então sem `x-origem` a função devolve `web`; `script` só aparece em SQL direto (Management API). O teste fixa esse comportamento.

`erp/testes/integracao/busca.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonimo, criarUsuarioTeste, garantirMigracoes, type UsuarioTeste } from "./ambiente";

let leitura: UsuarioTeste;
beforeAll(async () => {
  await garantirMigracoes();
  leitura = await criarUsuarioTeste("leitura");
});
afterAll(async () => leitura?.remover());

describe("buscar_global", () => {
  it("acha categoria sem acento e respeita filtro de tipo", async () => {
    const { data } = await leitura.cliente.rpc("buscar_global", { termo: "formula" });
    expect(data?.some((r) => r.tipo === "categoria" && r.titulo === "Fórmula 1")).toBe(true);
    const { data: so } = await leitura.cliente.rpc("buscar_global", { termo: "kg", tipos: ["unidade"] });
    expect(so?.map((r) => r.tipo)).toEqual(["unidade"]);
    expect(so?.[0].titulo).toBe("quilograma");
  });
  it("anônimo não executa a função", async () => {
    const { error } = await anonimo().rpc("buscar_global", { termo: "formula" });
    expect(error).not.toBeNull();
  });
});
```

Rodar:

```bash
cd erp && npm run test:integracao
```

Esperado: 3 arquivos, 7 testes passando contra `fcs-os-teste`. Se falhar com "rode npm run migrar", aplicar as migrações no alvo teste.

- [ ] **Step 3: Playwright**

```bash
cd erp && npx playwright install chromium
```

`erp/playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  testDir: "testes/e2e",
  outputDir: "testes/relatorios/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "testes/relatorios/html", open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  webServer: { command: "npm run dev", url: "http://localhost:3000/login", reuseExistingServer: true, timeout: 120_000 },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
```

`erp/testes/e2e/apoio.ts`:

```ts
import { expect, type Page } from "@playwright/test";

export const CREDENCIAIS = { email: process.env.E2E_EMAIL ?? "", senha: process.env.E2E_SENHA ?? "" };

export async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(CREDENCIAIS.email);
  await page.getByLabel("Senha").fill(CREDENCIAIS.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Início" })).toBeVisible();
}
```

`erp/testes/e2e/login.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

test("senha errada mostra erro e senha certa entra", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("E-mail").fill(CREDENCIAIS.email);
  await page.getByLabel("Senha").fill("senha-errada-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert")).toContainText("E-mail ou senha incorretos");
  await entrar(page);
});

test("sair volta para o login", async ({ page }) => {
  await entrar(page);
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
```

`erp/testes/e2e/navegacao.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

test("sidebar recolhe, breadcrumb acompanha e tema persiste", async ({ page }) => {
  await entrar(page);
  await expect(page.getByText("Configurações", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Canais de venda" }).click();
  await expect(page.getByRole("heading", { name: "Canais de venda" })).toBeVisible();
  await expect(page.locator("nav[aria-label='breadcrumb']")).toContainText("Canais de venda");
  await page.getByRole("button", { name: "Abrir ou recolher o menu" }).click();
  await expect(page.locator("[data-slot='sidebar'][data-state='collapsed'], [data-state='collapsed']").first()).toBeVisible();
  await page.getByRole("button", { name: "Usar tema claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-tema", "claro");
  await page.getByRole("button", { name: "Usar tema escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-tema", "escuro");
});
```

`erp/testes/e2e/configuracoes.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

test("cria categoria, encontra na busca e inativa", async ({ page }) => {
  const nome = `E2E ${Date.now()}`;
  await entrar(page);
  await page.goto("/configuracoes/categorias?escopo=produto");
  await page.getByRole("button", { name: "Nova categoria" }).click();
  await page.getByLabel("Nome").fill(nome);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Categoria salva.")).toBeVisible();
  await expect(page.getByRole("cell", { name: nome })).toBeVisible();

  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Buscar canal, categoria, unidade...").fill(nome.toLowerCase());
  await expect(page.getByRole("option", { name: new RegExp(nome) })).toBeVisible();
  await page.getByRole("option", { name: new RegExp(nome) }).click();
  await expect(page).toHaveURL(/escopo=produto&destaque=/);

  const linha = page.getByRole("row", { name: new RegExp(nome) });
  await linha.getByRole("button", { name: "Inativar" }).click();
  await expect(page.getByText("Categoria inativada.")).toBeVisible();
  await expect(linha.getByText("Inativa")).toBeVisible();
});
```

`erp/testes/e2e/responsivo.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { CREDENCIAIS, entrar } from "./apoio";

test.skip(!CREDENCIAIS.email, "defina E2E_EMAIL e E2E_SENHA em erp/.env.local");

for (const largura of [1440, 1024, 390]) {
  test(`sem rolagem horizontal em ${largura}px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await entrar(page);
    for (const rota of ["/", "/configuracoes/canais", "/configuracoes/categorias"]) {
      await page.goto(rota);
      const estoura = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(estoura, `${rota} em ${largura}px`).toBe(false);
      await page.screenshot({ path: `testes/relatorios/capturas/${largura}${rota.replace(/\//g, "_") || "_inicio"}.png`, fullPage: true });
    }
  });
}
```

Preparar o usuário e2e (dono no dev, pode ser o próprio dono já criado) e preencher `E2E_EMAIL` e `E2E_SENHA` em `erp/.env.local`. Rodar:

```bash
cd erp && npm run e2e
```

Esperado: 7 testes passando; capturas em `testes/relatorios/capturas/`. Se o seletor do estado recolhido da sidebar falhar, abrir `src/componentes/ui/sidebar.tsx`, conferir qual elemento recebe `data-state="collapsed"` e ajustar o seletor.

- [ ] **Step 4: CI**

`.github/workflows/ci.yml`:

```yaml
name: ci
on:
  push:
    paths: ["erp/**", "supabase/**", ".github/workflows/ci.yml"]
  pull_request:
    paths: ["erp/**", "supabase/**", ".github/workflows/ci.yml"]
jobs:
  erp:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: erp
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: erp/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
        env:
          SUPABASE_URL: https://exemplo.supabase.co
          SUPABASE_ANON_KEY: chave-falsa-so-para-build
      - name: nenhum segredo no bundle do navegador
        run: |
          if grep -rq "SUPABASE_SERVICE_ROLE_KEY\|service_role" .next/static; then
            echo "segredo encontrado no bundle"; exit 1; fi
```

- [ ] **Step 5: Commit**

```bash
git add erp .github
git commit -m "erp: testes de integracao (RLS, auditoria, busca), e2e e CI"
```

---

### Task 15: Documentação, CLAUDE.md e referências visuais

**Files:**
- Create: `erp/docs/arquitetura.md`, `modelo-de-dados.md`, `regras-de-negocio.md`, `configuracao-local.md`, `variaveis-de-ambiente.md`, `design-system.md`, `testes.md`, `referencias-visuais/README.md`, `referencias-visuais/fontes.md`, `erp/CLAUDE.md`, `erp/README.md`
- Move: `identidade/REFERENCIAS DESIGN WEB/*` para `erp/docs/referencias-visuais/` com nomes em kebab-case
- Modify: `CLAUDE.md` (raiz)

- [ ] **Step 1: Mover referências e escrever as notas**

```bash
mkdir -p erp/docs/referencias-visuais
mv "identidade/REFERENCIAS DESIGN WEB/image.png" erp/docs/referencias-visuais/comunidade-sidebar-escura.png
mv "identidade/REFERENCIAS DESIGN WEB/Finance Bento Card UI Design.jpg" erp/docs/referencias-visuais/cartao-kpi-financeiro.jpg
mv "identidade/REFERENCIAS DESIGN WEB/Management Dashboard Ui.jpg" erp/docs/referencias-visuais/dashboard-gestao-timeline.jpg
mv "identidade/REFERENCIAS DESIGN WEB/download (17).jpg" erp/docs/referencias-visuais/sidebar-trilho-e-painel.jpg
mv "identidade/REFERENCIAS DESIGN WEB/download (18).jpg" erp/docs/referencias-visuais/sidebar-menu-aninhado.jpg
mv "identidade/REFERENCIAS DESIGN WEB/Iconly Pro _ Premium icons (@iconlypro) on Threads.jpg" erp/docs/referencias-visuais/icones-upload-tabbar.jpg
mv "identidade/REFERENCIAS DESIGN WEB/Kawsar Ahmed on Instagram_ _Have a project in mind_ Let's make it creative.jpg" erp/docs/referencias-visuais/cartao-meta-sparkline.jpg
rmdir "identidade/REFERENCIAS DESIGN WEB"
```

`erp/docs/referencias-visuais/README.md`:

```markdown
# Referências visuais do ERP

Direção: ferramenta de trabalho escura, densa e silenciosa. Preto da marca como fundo, ciano só em ação e foco, cores quentes só com significado (vencido, perda, inviável). Tipografia Inter no corpo, Chakra Petch em títulos e números grandes, JetBrains Mono em códigos. Raio 4 px, sem sombra, profundidade por tom. Tokens em `docs/design-system.md`.

As imagens desta pasta foram salvas pelo dono da empresa como inspiração. Nenhuma é copiada; cada uma empresta um padrão de estrutura. Fontes conhecidas em `fontes.md`.

| Imagem | O que inspira | O que evitar |
|---|---|---|
| comunidade-sidebar-escura.png | Menu agrupado com contadores por item, fundo quase preto, área de conteúdo com cabeçalho fixo | Azul do item ativo, visual de comunidade |
| cartao-kpi-financeiro.jpg | Cartão de indicador: rótulo pequeno, número grande, pílula de variação, área de gráfico | Fundo claro, ilustração decorativa |
| dashboard-gestao-timeline.jpg | Seletor de período (dia, semana, mês, ano), busca central no topo, timeline por recurso (vira carga por impressora na Fase 5) | Vidro, bolhas, três camadas de card |
| sidebar-trilho-e-painel.jpg | Dois estados de sidebar: trilho de ícones e painel expandido; grupos com contagem; árvore de documentos | Tons de cinza sem contraste |
| sidebar-menu-aninhado.jpg | Item ativo em bloco sólido, submenu com linha guia, pastas com contagem | Cantos muito redondos |
| icones-upload-tabbar.jpg | Traço uniforme dos ícones (lucide cumpre), área de upload com instrução de formato | Barra de abas inferior (não é app de celular) |
| cartao-meta-sparkline.jpg | Meta com valor atual, sparkline e texto de contexto curto | Laranja como destaque |
```

`erp/docs/referencias-visuais/fontes.md`:

```markdown
# Fontes das referências

- comunidade-sidebar-escura.png: captura de tela de uma comunidade na plataforma Circle (rodapé "Desenvolvido pela Circle"). URL original não registrada.
- cartao-kpi-financeiro.jpg: post do perfil "webdesign.uiux" (Instagram), título "Finance Bento Card UI Design". URL original não registrada.
- dashboard-gestao-timeline.jpg: imagem "Management Dashboard UI" salva do Pinterest. Autor não identificado.
- sidebar-trilho-e-painel.jpg e sidebar-menu-aninhado.jpg: downloads sem nome de origem. Autor não identificado.
- icones-upload-tabbar.jpg e cartao-meta-sparkline.jpg: posts da Iconly (iconly.pro) no Threads e no Instagram (perfil Kawsar Ahmed). URLs originais não registradas.

Quando a origem for localizada, acrescentar o link aqui. Nenhuma imagem é redistribuída fora deste repositório privado.
```

- [ ] **Step 2: Documentos técnicos**

`erp/docs/arquitetura.md`:

```markdown
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

Dependência permitida: `app -> componentes -> acoes -> dominio, dados`. `dominio` não importa nada das outras camadas (lint bloqueia).

## Sessão e permissão

- `src/proxy.ts` renova o cookie e manda deslogado para `/login`. Não decide permissão.
- Páginas chamam `exigirLeitura(area)`; actions chamam `exigirEscrita(area)`. Mapa em `lib/auth/papeis.ts`.
- O banco repete a regra com RLS (`app.papel_atual()`): a aplicação usa o cliente com a sessão do usuário, então uma falha de permissão na aplicação não vaza dado.
- Service role só em `lib/supabase/admin.ts` (criar usuário, listar e-mails) e em `ferramentas/`.

## Origem e auditoria

Todo cliente envia `x-origem` (`web`, `mcp`, `script`, `importacao`). O trigger `app.auditar()` grava antes, depois, usuário e origem em `auditoria`.

## Decisões (ADR curtas)

- 2026-10-11: app dentro do repositório `Fcs OS` em `erp/`, migrações na raiz (`supabase/migrations/`) aplicadas por `ferramentas/migrar.mjs` via Management API, porque não há Docker nem CLI logada na máquina e a regra do workspace já era essa.
- 2026-10-11: RLS real por papel em vez de service role com checagem só na aplicação, porque o endpoint MCP (Fase 2) também acessa o banco.
- 2026-10-11: shadcn/ui com tokens próprios em vez de componentes manuais, porque o ERP é denso em tabelas, diálogos e formulários.
```

`erp/docs/modelo-de-dados.md`:

```markdown
# Modelo de dados (Fase 1)

Convenções: `id uuid`, `criado_em`, `atualizado_em` (trigger `app.carimbar_atualizacao`), RLS em tudo, auditoria por trigger nas tabelas de cadastro. Percentuais como fração (`numeric(7,6)`), dinheiro `numeric(14,2)`.

| Tabela | Papel | Leitura | Escrita |
|---|---|---|---|
| `usuarios_app` | papel e situação de cada usuário do Auth | todo usuário ativo | dono |
| `auditoria` | antes, depois, usuário, origem de cada alteração | dono | trigger |
| `alertas` | alertas abertos e resolvidos, um aberto por (tipo, entidade) | todo usuário ativo | dono e operador |
| `tokens_integracao` | tokens do MCP (hash, escopos, validade) | dono | dono |
| `canais_venda` | marketplaces e canais | todo usuário ativo | dono |
| `canais_venda_taxas` | taxas por vigência; nulo = não configurado | todo usuário ativo | dono |
| `canais_venda_vigentes` (view) | canal com as taxas vigentes hoje | idem | |
| `categorias` | por escopo (produto, insumo, financeiro, conhecimento, planejamento), com pai e cor | todo usuário ativo | dono e operador |
| `unidades` | código, nome, base e fator | todo usuário ativo | dono |
| `migracoes_aplicadas` | controle do `migrar.mjs` | ninguém via API | script |

Funções: `app.normalizar(texto)`, `app.papel_atual()`, `app.eh_dono()`, `app.pode_escrever()`, `app.usuario_ativo()`, `app.origem_atual()`, `app.auditar()`, `public.buscar_global(termo, tipos, limite)`.

As tabelas das fases seguintes estão na spec (`docs/superpowers/specs/2026-10-11-erp-fcs-design.md`, seção 5) e entram aqui conforme forem criadas.
```

`erp/docs/regras-de-negocio.md`:

```markdown
# Regras de negócio

## Papéis

- `dono`: tudo.
- `operador`: lê tudo menos financeiro e usuários; escreve em conhecimento, estoque, catálogo, produção, vendas, planejamento e alertas.
- `leitura`: só lê, sem financeiro e sem usuários.
- Usuário do Auth sem linha ativa em `usuarios_app` não acessa nada.
- Ninguém altera o próprio papel nem desativa a própria conta pela tela.

## Canais e taxas

- Taxa é por vigência (`vigente_desde`). A vigente é a mais recente com data até hoje.
- Taxa em branco é "não configurado" e bloqueia o cálculo de preço daquele canal (Fase 4). Nunca há valor padrão.
- Percentuais são digitados em por cento ("14,5") e guardados como fração (0.145).

## Categorias e unidades

- Categoria é única por (escopo, nome); inativar em vez de apagar.
- Unidade tem base e fator (kg = 1000 g; h = 60 min). A base de uma base é nula.

## Auditoria

Toda alteração em cadastro gera linha em `auditoria` com origem (`web`, `mcp`, `script`, `importacao`). O dono consulta.

As regras de estoque, custos, pedidos e financeiro estão na spec (seções 5.3 a 5.7 e 7) e entram aqui quando forem implementadas.
```

`erp/docs/configuracao-local.md`:

```markdown
# Configuração local

Pré-requisitos: Node 24, npm, Git. Sem Docker (o banco é remoto).

1. `cd erp && npm install`
2. Copiar `erp/.env.example` para `erp/.env.local` e preencher com os valores do projeto `fcs-os` (os mesmos do `.env` da raiz).
3. Aplicar migrações: `npm run migrar -- --alvo dev` (usa `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF` do `.env` da raiz).
4. Gerar tipos: `npm run tipos`.
5. Criar o primeiro usuário: `node ferramentas/criar-usuario.mjs --email=... --nome=... --senha=... --papel=dono`.
6. `npm run dev` e abrir `http://localhost:3000`.

Banco de teste: `node ferramentas/projeto-teste.mjs criar` (uma vez), depois `npm run migrar -- --alvo teste`. Se o projeto pausar por inatividade: `node ferramentas/projeto-teste.mjs restaurar`.

Comandos: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integracao`, `npm run e2e`, `npm run build`, `npm run formatar`.
```

`erp/docs/variaveis-de-ambiente.md`:

```markdown
# Variáveis de ambiente

| Variável | Onde | Uso | Vai ao navegador? |
|---|---|---|---|
| `SUPABASE_URL` | `erp/.env.local`, host | URL do projeto | não (só servidor) |
| `SUPABASE_ANON_KEY` | `erp/.env.local`, host | cliente com sessão (RLS vale) | não |
| `SUPABASE_SERVICE_ROLE_KEY` | `erp/.env.local`, host | criar usuário, listar e-mails | nunca |
| `E2E_EMAIL`, `E2E_SENHA` | `erp/.env.local` | testes e2e | não |
| `SUPABASE_ACCESS_TOKEN` | `.env` da raiz | Management API (migrações, projeto de teste) | nunca |
| `SUPABASE_PROJECT_REF` | `.env` da raiz | alvo dev | não |
| `SUPABASE_TESTE_*` | `.env` da raiz | projeto de teste | não |

Nenhuma variável `NEXT_PUBLIC_*` existe. O CI falha se "service_role" aparecer em `.next/static`.
```

`erp/docs/design-system.md`:

```markdown
# Design system

Tokens em `src/app/globals.css` (escuro no `:root`, claro em `[data-tema="claro"]`). Cores: fundo, superficie, superficie-2, borda, texto, texto-2, texto-3, acao, acao-texto, acao-suave, sucesso, alerta, erro, info. Os nomes do shadcn (background, card, primary, muted, destructive, border, ring, sidebar) apontam para esses tokens.

Tipografia: Inter (corpo), Chakra Petch (h1, h2 e números de KPI, classe `font-titulo`), JetBrains Mono (códigos, classe `font-mono`). Números em tabela usam `.numeros` (tabulares).

Forma: raio 4 px, borda 1 px, sem sombra, foco com contorno ciano de 2 px.

Componentes próprios (`src/componentes/painel/`): Sidebar, BarraTopo, BuscaGlobal, TabelaDados, CartaoIndicador, EstadoVazio, Banner, SeletorPeriodo, DialogoNovo, BotaoAcao, Campo, CampoErro, SelectNativo. Base shadcn em `src/componentes/ui/`.

Estados obrigatórios em toda tela: carregando (skeleton), vazio (EstadoVazio com ação), erro (Banner tipo erro), sucesso (toast). Sem spinner.

Responsivo: sidebar vira folha lateral abaixo de 768 px; tabelas rolam na horizontal dentro do próprio contêiner; conteúdo até 1400 px.

Proibido: borda colorida à esquerda em card, gradiente, vidro, três cards iguais em linha, emoji, travessão.
```

`erp/docs/testes.md`:

```markdown
# Testes

- Unitários (`npm test`): Vitest, arquivos `*.test.ts` ao lado do código. Cobrem domínio, papéis, formatos, navegação, formulários e as ferramentas de migração. Rodam no CI.
- Integração (`npm run test:integracao`): Vitest contra o projeto `fcs-os-teste`, usuários criados e removidos pelo próprio teste. Cobrem RLS por papel, auditoria com origem e busca global. Só local (precisam de segredo).
- E2E (`npm run e2e`): Playwright contra `npm run dev` com um usuário dono real. Cobrem login, navegação, tema, criação e busca de categoria e ausência de rolagem horizontal em 1440, 1024 e 390 px. Capturas em `testes/relatorios/capturas/`.

Regra: função nova no domínio nasce com teste; migração nova que muda permissão ganha caso em `rls.test.ts`; tela nova ganha pelo menos um fluxo e2e.
```

`erp/README.md`:

```markdown
# FCS ERP

Sistema de gestão da FCS 3D STUDIO. Documentação em `docs/`, plano aprovado em `docs/superpowers/specs/2026-10-11-erp-fcs-design.md`. Comece por `docs/configuracao-local.md`.
```

- [ ] **Step 3: `erp/CLAUDE.md`**

```markdown
# FCS ERP: instruções permanentes

Aplicação Next.js 16 do sistema de gestão da FCS 3D STUDIO. Spec aprovada: `docs/superpowers/specs/2026-10-11-erp-fcs-design.md`. Antes de propor mudança de arquitetura, ler `docs/arquitetura.md` e, a partir da Fase 2, consultar a base de conhecimento (`kb_decisoes`, `kb_buscar`).

## Comandos

`npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integracao` (projeto de teste), `npm run e2e`, `npm run migrar -- --alvo dev|teste`, `npm run tipos`, `npm run formatar`.

## Regras de camadas

- `src/dominio/`: regras puras, sem React, Next ou Supabase. Toda fórmula com teste ao lado e documentada em `docs/formulas-de-custo.md` ou `docs/regras-de-negocio.md`.
- `src/acoes/`: server actions, sempre `exigirEscrita(area)` antes de qualquer coisa, zod depois, `revalidatePath` no fim.
- `src/dados/`: só consultas, `import "server-only"`, cliente com sessão (`clienteServidor`). Service role só em `lib/supabase/admin.ts` e `ferramentas/`.
- `src/app/`: composição. Nenhuma regra de negócio em componente.

## Banco

- Migração nova = arquivo `supabase/migrations/NNNN_nome.sql` na raiz do repositório, aplicado em dev e em teste, seguido de `npm run tipos`. Nunca editar migração aplicada.
- Toda tabela nasce com RLS e, se for cadastro, com trigger `app.auditar()`.
- Nunca inventar número: campo sem dado real fica nulo e a tela mostra "Sem dados" ou "Não configurado".

## Padrões

- Português em código, rotas, tabelas e textos. Sem emoji. Sem travessão.
- Erros de validação são chaves traduzidas por `erroPt()` (`src/lib/erros-pt.ts`).
- Percentual digitado em por cento, guardado como fração.
- Dinheiro e custo em decimal (`decimal.js` no domínio, `numeric` no banco), nunca float em cálculo.

## Áreas críticas

Permissões (`lib/auth/papeis.ts` e policies), auditoria (`app.auditar`), motor de custos (Fase 4), estoque (Fase 3), lançamentos (Fase 7). Mudança nessas áreas exige teste de integração novo.

## Antes de dizer que terminou

`npm run lint && npm run typecheck && npm test && npm run build`. Se tocou em banco ou permissão, `npm run test:integracao`. Se tocou em tela, `npm run e2e`.
```

- [ ] **Step 4: `CLAUDE.md` da raiz**

Acrescentar na lista de estrutura de pastas, depois da linha de `mini-projetos/`:

```
- `erp/` — FCS ERP, o sistema de gestão (Next.js + Supabase). Regras próprias em `erp/CLAUDE.md`; plano aprovado em `erp/docs/superpowers/specs/2026-10-11-erp-fcs-design.md`; migrações do banco ficam em `supabase/migrations/` na raiz
```

Em "Regras do sistema", acrescentar:

```
- Regra de negócio do ERP só em `erp/src/dominio`; migração só em `supabase/migrations/`, aplicada em dev e teste com `npm run migrar` dentro de `erp/`
```

Em "Ferramentas conectadas", na linha do Supabase, acrescentar ao final: `Projeto de teste fcs-os-teste (sa-east-1) criado em <data> para os testes de integração do ERP.` E remover a linha "Pastas a criar conforme a operação pedir: produtos/" trocando por: `A ficha de produto vive no ERP (Fase 5), não em pasta.`

- [ ] **Step 5: Verificação final da fase e commit**

```bash
cd erp && npm run lint && npm run typecheck && npm test && npm run test:integracao && npm run build && npm run e2e
```

Esperado: tudo verde. Conferir os critérios de conclusão da Fase 1 na spec: usuário real loga, configura canais e categorias, busca devolve esses registros, usuário de leitura não escreve por tela nem por API (teste de RLS), layout em 1440, 1024 e 390 px sem rolagem horizontal.

```bash
git add -A erp supabase .github CLAUDE.md identidade
git commit -m "erp: documentacao da Fase 1, CLAUDE.md e referencias visuais"
```

Avisar o usuário que a Fase 1 está pronta para `/salvar` (push) e que a Fase 2 (base de conhecimento e MCP) é a próxima, com plano próprio a escrever.

---

## Autorrevisão do plano

Cobertura da spec (Fase 1): esqueleto, auth e-mail+senha, middleware de sessão, papéis e `exigirPapel` (Task 6), layout com sidebar em dois estados e responsivo (Task 9), design system com tokens (Task 7), configurações de canais, categorias, unidades e usuários (Task 12), busca global com `buscar_global` (Tasks 5 e 10), componentes do design system (Tasks 7 e 11), dashboard vazio honesto (Task 13), CI (Task 14), `CLAUDE.md` e docs (Task 15), migrações 0001 a 0004 com RLS, auditoria, alertas, tokens e sementes (Tasks 2 a 5), teste de RLS com dois usuários e e2e em três larguras (Task 14). Tokens de integração têm tabela nesta fase e tela na Fase 2, conforme a spec.

Consistência de nomes conferida: `clienteServidor`, `clienteAdmin`, `usuarioAtual`, `exigirLeitura`, `exigirEscrita`, `podeLer`, `podeEscrever`, `gruposVisiveis`, `itemAtivo`, `trilha`, `agruparResultados`, `TIPOS_DISPONIVEIS`, `campoFracao`, `campoValor`, `campoInteiro`, `textoOpcional`, `ResultadoAcao`, `ContextoDialogo`, `useAoSalvar`, `DialogoNovo`, `BotaoAcao`, `TabelaDados`, `listarCanais`, `obterCanal`, `listarTaxas`, `salvarCanal`, `salvarTaxas`, `excluirTaxas`, `listarCategorias`, `salvarCategoria`, `alternarAtivoCategoria`, `listarUnidades`, `salvarUnidade`, `listarUsuarios`, `criarUsuario`, `alterarUsuario`, `resumoInicial`, `contarAlertasAbertos`.

Pontos a confirmar na execução (não são placeholders, são verificações): nome do cookie da sidebar no arquivo gerado pelo shadcn; nome exato do `data-state` recolhido para o seletor do e2e; se o `init` do shadcn 4.x gerar `tw-animate-css`; versão do `@tanstack/react-table` 8 instalada.
