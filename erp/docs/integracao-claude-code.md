# Integração com o Claude Code

A base de conhecimento do ERP é a memória operacional da empresa. O Claude Code lê e grava nela por um servidor MCP que a própria aplicação expõe, com token próprio, escopos e auditoria. A captura é intencional: só o que o usuário manda salvar, depois de ver a prévia.

## Arquitetura

```
VS Code / terminal                         ERP (Next.js)                         Supabase
Claude Code ── skills kb-* ── token ──▶ /api/mcp (mcp-handler, Streamable HTTP) ──▶ conhecimentos*
.mcp.json (raiz do Fcs OS)              verificaToken (hash, validade, papel)        auditoria (origem mcp, usuario do token)
                                        escopo + limite por token + filtro de segredo
```

- Rota: `erp/src/app/api/mcp/route.ts` monta `src/mcp/servidor.ts` (`createMcpHandler` + `withMcpAuth`). Sem sessão, sem Redis.
- Token: criado em Configurações > Integrações (ou `node ferramentas/criar-token.mjs`), formato `fcs_` + 43 caracteres. O banco guarda SHA-256 e prefixo. Validade padrão de 90 dias, revogável.
- Autoria: o servidor usa a service role, mas envia `x-origem: mcp` e `x-usuario-id` (dono do token). O banco atribui `criado_por`, versões e auditoria a esse usuário (`app.usuario_da_requisicao`). A permissão é aplicada no servidor com as mesmas regras de `lib/auth/papeis.ts` (leitura não grava; conteúdo restrito só para dono). O servidor só toca `conhecimentos*`, `tokens_integracao` (último uso) e lê `alertas` e `categorias`.
- Limite: 60 chamadas por minuto por token, em memória por processo. Token inválido fica 5 s em cache negativo.
- Filtro de segredos: `kb_salvar` e `kb_atualizar` recusam texto com padrão de chave, token ou senha (`src/dominio/conhecimento/segredos.ts`). A tela aplica o mesmo filtro.

## Ferramentas

| Ferramenta | Escopo | O que faz |
|---|---|---|
| `kb_buscar` | conhecimento:ler | busca por termo (título, resumo, tags, conteúdo, sem acento), tipo, tag, módulo |
| `kb_obter` | conhecimento:ler | registro completo por id ou slug |
| `kb_salvar` | conhecimento:escrever | cria registro com origem `claude_code` |
| `kb_atualizar` | conhecimento:escrever | atualiza e guarda a versão anterior com motivo |
| `kb_decisoes` | conhecimento:ler | decisões ativas por módulo |
| `custos_regras`, `produto_custo` | custos:ler | chegam na Fase 4 |
| `alertas_abertos` | operacao:ler | alertas em aberto |
| `estoque_insumo` | operacao:ler | saldo, valor, custo médio e lotes dos insumos (Fase 3) |

## Configuração no workspace

`.mcp.json` na raiz do repositório (versionado, sem segredo):

```json
{ "mcpServers": { "fcs-erp": { "type": "http",
  "url": "${FCS_ERP_URL:-http://localhost:3000}/api/mcp",
  "headers": { "Authorization": "Bearer ${FCS_ERP_MCP_TOKEN}" } } } }
```

No Windows, defina as variáveis para o usuário (abra o terminal de novo depois): `setx FCS_ERP_MCP_TOKEN "fcs_..."` e `setx FCS_ERP_URL "http://localhost:3000"`. Com o ERP rodando (`npm run dev`), abra o Claude Code na pasta do Fcs OS e aprove o servidor `fcs-erp` quando ele perguntar.

Teste rápido sem o Claude Code: `node ferramentas/mcp-smoke.mjs petg` (lê `FCS_ERP_MCP_TOKEN` de `erp/.env.local`).

## Skills

Em `.claude/skills/`: `kb-buscar`, `kb-salvar`, `kb-decisao`, `kb-procedimento`. Todas mostram a prévia e só gravam após confirmação; todas removem segredo e dado pessoal antes de salvar. A regra permanente em `erp/CLAUDE.md` manda consultar `kb_decisoes` e `kb_buscar` antes de propor mudança de arquitetura.

## Sugestão de captura (opcional, desligada)

`erp/ferramentas/hooks/sugerir-captura.mjs` é um hook `Stop`: lê só a última resposta do assistente, procura marcadores de decisão ou solução e mostra um aviso "Salvar com /kb-salvar?". Não grava, não injeta no modelo, não lê transcript. Para ligar, em `.claude/settings.local.json`:

```json
{ "hooks": { "Stop": [ { "hooks": [ { "type": "command", "command": "node erp/ferramentas/hooks/sugerir-captura.mjs" } ] } ] } }
```

## O que a integração não faz

- Não lê o histórico de conversas nem o `transcript_path` dos hooks.
- Não executa SQL recebido do cliente nem escreve fora da base de conhecimento.
- Não substitui a validação humana: o campo "validado" é marcado pela pessoa, na tela.
- Não compartilha dados com o claude-mem; são sistemas separados.

## Limites confirmados (Claude Code 2.1.283, 12/10/2026)

Hooks recebem `prompt` (UserPromptSubmit), `tool_response` (PostToolUse), `last_assistant_message` e `stop_hook_active` (Stop); `additionalContext` funciona nesses eventos. `.mcp.json` por projeto aceita `${VAR}` e exige aprovação do usuário na primeira vez. Skills aceitam `allowed-tools`.
