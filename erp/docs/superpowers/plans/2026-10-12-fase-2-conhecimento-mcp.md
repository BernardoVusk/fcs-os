# Fase 2 (Base de conhecimento e integração com Claude Code): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar, versionar, relacionar e pesquisar conhecimentos no ERP e expor isso ao Claude Code por um endpoint MCP autenticado por token com escopos, mais quatro skills de workspace, de modo que "salve esse procedimento" e "o que já documentamos sobre PETG" funcionem de ponta a ponta.

**Architecture:** Tabelas `conhecimentos*` com versão por trigger, busca por `tsvector` + trigram no ramo `conhecimento` de `buscar_global`, RLS por papel. Rota `src/app/api/mcp/route.ts` com `mcp-handler` 2 e `@modelcontextprotocol/server` 2 (Streamable HTTP, sem sessão), token Bearer validado por hash em `tokens_integracao`, ferramentas que chamam a mesma camada `dados/conhecimento` usando o cliente de serviço restrito ao módulo, com permissão aplicada em código pelas mesmas regras de `lib/auth/papeis.ts` e autoria registrada via cabeçalho `x-usuario-id` lido pelo trigger de auditoria. Skills em `.claude/skills/kb-*` e `.mcp.json` na raiz do repositório.

**Tech Stack:** o da Fase 1 mais `mcp-handler@^2.3`, `@modelcontextprotocol/server@^2.3`, `react-markdown@^10`, `remark-gfm@^4`.

Spec de referência: `docs/superpowers/specs/2026-10-11-erp-fcs-design.md`, seções 5.2, 5.9, 6 e 10 (Fase 2).

## Global Constraints

Valem as da Fase 1 (`docs/superpowers/plans/2026-10-11-fase-1-fundacao.md`) e mais:

- O endpoint MCP só lê e escreve em `conhecimentos*`, `tokens_integracao` (uso) e lê `alertas` e `canais_venda_vigentes`. Nenhuma ferramenta recebe SQL.
- Token aparece em claro uma única vez, na criação; o banco guarda só o hash SHA-256 e o prefixo.
- Conteúdo com padrão de segredo (`sk-`, `eyJ`, `AKIA`, `-----BEGIN`, `SUPABASE_SERVICE_ROLE_KEY=`, `xox[bp]-`, `ghp_`) é recusado em `kb_salvar` e `kb_atualizar` e também na tela.
- Captura é intencional: nada lê transcript nem histórico. O hook `Stop` opcional só sugere.
- Comandos do Bash abaixo de 6 KB; arquivos grandes pela ferramenta Write.

## Mapa de arquivos da Fase 2

```
supabase/migrations/0005_conhecimento.sql       tabelas, trigger de versão, busca, RLS, auditoria com x-usuario-id
erp/src/dominio/conhecimento/
  tipos.ts                 TIPOS, CONFIDENCIALIDADES, STATUS, rótulos
  slug.ts (+test)          gerarSlug(titulo)
  segredos.ts (+test)      contemSegredo(texto): { achou, padrao }
  escopos.ts (+test)       ESCOPOS, escopoPara(ferramenta), temEscopo(escopos, necessario)
erp/src/dados/conhecimento.ts                     listar, obter, criar, atualizar, versoes, relacoes, decisoes, contar
erp/src/acoes/conhecimento.ts                     salvarConhecimento, alternarValidado, arquivar, relacionar
erp/src/dados/integracoes.ts, src/acoes/integracoes.ts   tokens: criar (devolve claro uma vez), revogar, listar
erp/src/mcp/
  autenticacao.ts          verificarToken(bearer) -> { usuario, papel, escopos, tokenId } | null, registrarUso
  limite.ts (+test)        limitador por token (60/min, em memória)
  ferramentas.ts           definição das 8 ferramentas (zod + handler)
  servidor.ts              createMcpHandler + withMcpAuth
erp/src/app/api/mcp/route.ts                      export { handler as GET, POST, DELETE }
erp/src/app/(painel)/conhecimento/page.tsx, novo/page.tsx, [id]/page.tsx, [id]/editar/page.tsx, decisoes/page.tsx
erp/src/app/(painel)/configuracoes/integracoes/page.tsx
erp/src/componentes/conhecimento/  FormConhecimento.tsx, Markdown.tsx, ListaConhecimentos.tsx, FiltrosConhecimento.tsx, Versoes.tsx, Relacoes.tsx, Tags.tsx
erp/src/componentes/configuracoes/ FormToken.tsx, TabelaTokens.tsx, TokenRevelado.tsx
erp/ferramentas/mcp-smoke.mjs                      initialize + tools/list + kb_buscar por JSON-RPC contra o dev
erp/ferramentas/hooks/sugerir-captura.mjs          hook Stop opcional
.mcp.json                                          servidor fcs-erp (http) com ${FCS_ERP_URL} e ${FCS_ERP_MCP_TOKEN}
.claude/skills/kb-salvar|kb-buscar|kb-decisao|kb-procedimento/SKILL.md
erp/docs/integracao-claude-code.md, docs/modelo-de-dados.md (+ tabelas), erp/CLAUDE.md (regra de consulta)
erp/testes/integracao/conhecimento.test.ts, mcp.test.ts ; testes/e2e/conhecimento.spec.ts
```

Ordem: 1 migração e domínio, 2 dados e ações, 3 telas de conhecimento, 4 tokens de integração, 5 servidor MCP, 6 `.mcp.json`, skills e hook, 7 testes e docs.

---

### Task 1: Migração 0005 e domínio puro

**Files:** `supabase/migrations/0005_conhecimento.sql`; `erp/src/dominio/conhecimento/{tipos,slug,segredos,escopos}.ts` e testes.

**Interfaces produzidas:** tabelas `conhecimentos`, `conhecimentos_versoes`, `conhecimentos_relacoes`, `conhecimentos_anexos`; bucket privado `anexos-conhecimento`; `buscar_global` com ramo `conhecimento`; `app.auditar()` atribuindo `usuario_id` pelo cabeçalho `x-usuario-id` quando a chamada é da service role; funções puras `gerarSlug`, `contemSegredo`, `temEscopo`.

- [ ] Testes de domínio:

```ts
// slug.test.ts
expect(gerarSlug("Perfil PETG na Ender 3: 235 °C")).toBe("perfil-petg-na-ender-3-235-c");
expect(gerarSlug("   ")).toBe("");
// segredos.test.ts
expect(contemSegredo("use a chave sk-abc123def456ghi789").achou).toBe(true);
expect(contemSegredo("SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi").padrao).toBe("variavel_sensivel");
expect(contemSegredo("o bico de 0,4 mm entope com PETG úmido").achou).toBe(false);
// escopos.test.ts
expect(temEscopo(["conhecimento:ler"], "conhecimento:ler")).toBe(true);
expect(temEscopo(["conhecimento:ler"], "conhecimento:escrever")).toBe(false);
expect(escopoPara("kb_salvar")).toBe("conhecimento:escrever");
```

- [ ] Migração (resumo do conteúdo; escrever completo):

```sql
create table public.conhecimentos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null check (char_length(titulo) between 3 and 160),
  resumo text check (char_length(resumo) <= 400),
  conteudo text not null check (char_length(conteudo) <= 60000),
  tipo text not null check (tipo in ('procedimento','solucao','decisao','referencia','perfil_impressao','nota')),
  categoria_id uuid references public.categorias (id),
  tags text[] not null default '{}',
  modulo text, projeto text,
  origem text not null default 'manual' check (origem in ('manual','claude_code','importacao')),
  referencia text,
  confidencialidade text not null default 'interno' check (confidencialidade in ('interno','restrito')),
  estrutura jsonb,                      -- decisão: {contexto, alternativas[], decisao, consequencias}
  validado boolean not null default false, validado_por uuid, validado_em timestamptz,
  status text not null default 'ativo' check (status in ('rascunho','ativo','arquivado')),
  versao integer not null default 1,
  criado_por uuid, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
  busca tsvector generated always as (
    setweight(to_tsvector('portuguese', coalesce(titulo,'')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(resumo,'')), 'B') ||
    setweight(to_tsvector('portuguese', array_to_string(tags, ' ')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(conteudo,'')), 'C')) stored
);
create index conhecimentos_busca on public.conhecimentos using gin (busca);
create index conhecimentos_titulo_trgm on public.conhecimentos using gin (app.normalizar(titulo) extensions.gin_trgm_ops);
create index conhecimentos_tags on public.conhecimentos using gin (tags);

create table public.conhecimentos_versoes (id bigint generated always as identity primary key, conhecimento_id uuid references public.conhecimentos(id) on delete cascade, versao integer not null, titulo text, resumo text, conteudo text, tags text[], estrutura jsonb, alterado_por uuid, origem text, motivo text, em timestamptz not null default now(), unique (conhecimento_id, versao));
create table public.conhecimentos_relacoes (de_id uuid references public.conhecimentos(id) on delete cascade, para_id uuid references public.conhecimentos(id) on delete cascade, tipo text not null check (tipo in ('relacionado','substitui','deriva_de')), primary key (de_id, para_id), check (de_id <> para_id));
create table public.conhecimentos_anexos (id uuid primary key default gen_random_uuid(), conhecimento_id uuid references public.conhecimentos(id) on delete cascade, storage_path text not null, nome text not null, tamanho integer, tipo text, criado_em timestamptz not null default now());

-- versão: toda alteração de titulo, resumo, conteudo, tags ou estrutura grava a versão ANTERIOR e incrementa
create function app.versionar_conhecimento() returns trigger ... (before update: if campos mudaram then insert into conhecimentos_versoes (dados de OLD, versao OLD.versao, alterado_por auth.uid() ou x-usuario-id, origem app.origem_atual(), motivo current_setting('app.motivo', true)); new.versao := old.versao + 1; new.atualizado_em := now())
-- auditoria: autoria pela service role
create or replace function app.usuario_da_requisicao() returns uuid ... (auth.uid(), senão, se role = service_role, cabeçalho x-usuario-id)
-- app.auditar() passa a usar app.usuario_da_requisicao()
-- RLS
select: usuario_ativo() and (confidencialidade = 'interno' or eh_dono())
insert/update: pode_escrever() ; delete: eh_dono() (arquivar é update)
versoes/relacoes/anexos: select usuario_ativo(); escrita pode_escrever()
-- buscar_global: create or replace com o ramo 'conhecimento' (ts_rank sobre busca + similarity do título; rota '/conhecimento/' || id; subtitulo = tipo)
-- bucket: insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('anexos-conhecimento','anexos-conhecimento', false, 10485760, array['image/png','image/jpeg','image/webp','application/pdf','text/plain','text/markdown']) on conflict do nothing; policies de storage.objects por usuario_ativo()/pode_escrever()
```

- [ ] Aplicar em dev e teste, `npm run tipos`, commit `banco: conhecimentos, versoes, relacoes, anexos e busca`.

### Task 2: Dados e ações

`dados/conhecimento.ts`: `listarConhecimentos({ termo?, tipo?, categoriaId?, tag?, status?, limite })`, `obterConhecimento(idOuSlug)`, `listarVersoes(id)`, `listarRelacoes(id)`, `listarDecisoes(modulo?)`, `contarAtivos()`. Todas com `clienteServidor()`.

`acoes/conhecimento.ts`: `salvarConhecimento(estado, fd)` (zod: titulo, resumo, conteudo, tipo, categoria_id, tags "a, b", modulo, referencia, confidencialidade, estrutura para decisão; recusa segredo com chave `contem_segredo`; cria slug único com sufixo numérico; insert ou update com `set_config('app.motivo', ...)` via rpc `app.definir_motivo`? Não: motivo vai no update como coluna transitória? Simplificar: `motivo` é passado por cabeçalho `x-motivo` lido pelo trigger, igual à origem), `alternarValidado(id)`, `arquivarConhecimento(id)`, `relacionar(deId, paraId, tipo)`, `removerRelacao`.

Ferramenta compartilhada `src/dados/conhecimento-escrita.ts` com `criarConhecimentoCom(cliente, usuarioId, dados)` e `atualizarConhecimentoCom(cliente, usuarioId, id, dados, motivo)` usada pela ação (cliente do usuário) e pelo MCP (cliente de serviço com cabeçalhos `x-origem: mcp`, `x-usuario-id`).

### Task 3: Telas

- `/conhecimento`: `CabecalhoPagina` + filtros (busca por texto com `buscar_global` restrito a `conhecimento` ou `ilike` no título; tipo; categoria; tag; status) na URL; lista em cartões compactos (título, tipo em badge, tags, categoria, atualizado em, validado em badge verde); botão "Novo conhecimento".
- `/conhecimento/novo` e `/conhecimento/[id]/editar`: `FormConhecimento` (título, tipo, categoria, tags, resumo, conteúdo markdown em `Textarea` alta com dica de sintaxe, módulo, referência, confidencialidade; se tipo = decisao, campos contexto, alternativas, decisão, consequências que viram `estrutura`).
- `/conhecimento/[id]`: cabeçalho com título, badges, "Validado por X em Y" ou botão Validar; `Markdown` (react-markdown + remark-gfm, classes de prosa próprias); painel lateral: metadados, relações (adicionar por busca), versões (lista com diff simples: data, quem, motivo, botão "ver"); ações Editar, Arquivar.
- `/conhecimento/decisoes`: lista das decisões ativas com contexto e decisão em destaque, filtro por módulo.
- `navegacao.ts`: `FASE_ATUAL = 2`. Dashboard: cartão "Conhecimentos ativos" com `contarAtivos()` e link.

### Task 4: Tokens de integração

- `/configuracoes/integracoes` (área `usuarios`, só dono): tabela (nome, prefixo, escopos, criado, último uso, validade, situação) com Revogar; `FormToken` (nome, escopos em checkboxes: `conhecimento:ler`, `conhecimento:escrever`, `custos:ler`, `operacao:ler`; validade 90 dias padrão, opção sem validade).
- Ação `criarToken`: gera 32 bytes base64url com prefixo `fcs_`, guarda `hash_token = sha256(token)` e `prefixo = token.slice(0, 12)`, devolve o token em claro uma vez para `TokenRevelado` (campo copiável + aviso).
- Ação `revogarToken(id)`.

### Task 5: Servidor MCP

```bash
cd erp && npm install mcp-handler@^2.3 @modelcontextprotocol/server@^2.3 react-markdown@^10 remark-gfm@^4
```

`src/mcp/autenticacao.ts`: `verificarToken(bearer)`: hash, busca em `tokens_integracao` pelo cliente de serviço (origem `mcp`), rejeita revogado/expirado, carrega `usuarios_app` (ativo, papel), atualiza `ultimo_uso_em` (sem await bloqueante), devolve `{ tokenId, usuarioId, papel, escopos }`.

`src/mcp/limite.ts`: janela deslizante de 60 s por `tokenId`, 60 chamadas; devolve `{ permitido, restante }`.

`src/mcp/ferramentas.ts`: registra com `server.registerTool(nome, { description, inputSchema }, handler)`; cada handler: `exigirEscopo(ctx, escopo)` (403 em texto de erro MCP), `limite`, chama `dados/conhecimento` com o cliente de serviço + cabeçalhos; respostas em `content: [{ type: "text", text: JSON.stringify(...) }]` com texto em português. Ferramentas: `kb_buscar`, `kb_obter`, `kb_salvar` (valida com o mesmo zod da ação, recusa segredo, exige `podeEscrever(papel, "conhecimento")`), `kb_atualizar`, `kb_decisoes`, `custos_regras` e `produto_custo` (devolvem "Disponível na Fase 4"), `alertas_abertos`.

`src/mcp/servidor.ts`:

```ts
import { createMcpHandler, withMcpAuth } from "mcp-handler";
const base = createMcpHandler((server) => registrarFerramentas(server));
export const handler = withMcpAuth(base, async (req, bearer) => {
  const sessao = bearer ? await verificarToken(bearer) : null;
  if (!sessao) return undefined;
  return { token: bearer!, scopes: sessao.escopos, clientId: sessao.tokenId, extra: sessao };
}, { required: true });
```

`src/app/api/mcp/route.ts`: `export { handler as GET, handler as POST, handler as DELETE }`. Conferir a assinatura real de `withMcpAuth` e de `ctx.http?.authInfo` na versão instalada antes de fechar o código.

`ferramentas/mcp-smoke.mjs`: faz `initialize`, `tools/list` e `tools/call kb_buscar` por fetch JSON-RPC (cabeçalhos `Accept: application/json, text/event-stream`, `Authorization: Bearer $FCS_ERP_MCP_TOKEN`) contra `FCS_ERP_URL` e imprime o resultado.

### Task 6: `.mcp.json`, skills e hook

`.mcp.json` na raiz do repositório (versionado, sem segredo):

```json
{ "mcpServers": { "fcs-erp": { "type": "http", "url": "${FCS_ERP_URL:-http://localhost:3000}/api/mcp", "headers": { "Authorization": "Bearer ${FCS_ERP_MCP_TOKEN}" } } } }
```

Skills (`.claude/skills/<nome>/SKILL.md`, frontmatter `name`, `description`, `allowed-tools: mcp__fcs-erp__*`):
- `kb-buscar`: chama `kb_buscar` com o termo, mostra título, tipo, resumo e rota; oferece `kb_obter`.
- `kb-salvar`: monta título, resumo, conteúdo em markdown, tipo, categoria (nome de `categorias` escopo conhecimento), tags, módulo e referência (arquivos e commit da conversa); remove qualquer segredo; chama `kb_buscar` para avisar quase-duplicata; mostra prévia; grava só após "sim".
- `kb-decisao`: estrutura contexto, alternativas, decisão, consequências; tipo `decisao`.
- `kb-procedimento`: transforma a solução em passos numerados com pré-requisitos e verificação; tipo `procedimento`.

Hook opcional `erp/ferramentas/hooks/sugerir-captura.mjs` (lê stdin JSON do `Stop`, procura `decidimos|a causa era|procedimento|solução|resolvido` em `last_assistant_message`, imprime `{ "systemMessage": "Parece conhecimento. Salvar com /kb-salvar?" }`), documentado com o snippet de `settings.local.json` em `docs/integracao-claude-code.md`. Não é ligado por padrão.

### Task 7: Testes, docs e fechamento

- Integração: `conhecimento.test.ts` (leitura lê interno mas não restrito; operador cria; update gera versão 2 com `motivo`; `buscar_global('petg')` acha pelo conteúdo), `mcp.test.ts` (verificarToken: válido, revogado, expirado, usuário inativo; limitador; `kb_salvar` com segredo recusa; `kb_salvar` com leitura recusa).
- E2E: criar conhecimento pela tela, abrir, editar (versão 2 aparece), buscar no Ctrl+K pelo título, validar; integrações: criar token (aparece uma vez), revogar.
- Smoke real: `npm run dev` + `node ferramentas/mcp-smoke.mjs` com um token recém-criado; depois, no Claude Code com `.mcp.json` aprovado, `/kb-buscar PETG`.
- Docs: `docs/integracao-claude-code.md` (arquitetura, token, escopos, skills, hook, limites confirmados, o que não é lido), `docs/modelo-de-dados.md`, `erp/CLAUDE.md` (antes de mudar arquitetura: `kb_decisoes` e `kb_buscar`), `_memoria`/`CLAUDE.md` raiz (ferramenta conectada: MCP do ERP).
- Registrar na própria base, pelo Claude Code, as três decisões da fase (stack e estrutura do ERP, MCP HTTP com token, Cache Components desligado) e a decisão de design (referências sobre a paleta da marca).
- Commit por tarefa; `/salvar` fica com o usuário.
