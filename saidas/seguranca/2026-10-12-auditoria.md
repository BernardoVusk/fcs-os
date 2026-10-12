---
data: 2026-10-12
escopo: FCS ERP (erp/, Next.js 16 + Supabase), servidor MCP em erp/src/mcp, migrações 0001 a 0019 em supabase/migrations
matrizes_aplicaveis: 9
achados: { critico: 0, alto: 0, medio: 2, baixo: 5 }
---

# Auditoria de segurança — FCS ERP

## Resumo executivo

Não há achado crítico nem alto. Nenhum segredo está versionado nem no histórico do git, toda tabela tem RLS, as escritas multi-tabela são funções atômicas e o servidor MCP exige token com hash, escopo e limite de taxa. O que apareceu é de reforço: uma função do banco que um usuário só leitura conseguia chamar para criar um recebível, a falta de cabeçalhos de segurança (um site de terceiros poderia embutir o painel num iframe), uma ferramenta de linha de comando com dependência vulnerável listada como dependência de produção, e parâmetros de data da URL que iam ao banco sem validar. Os quatro foram corrigidos nesta mesma rodada (migração 0019, `next.config.ts`, `package.json`, tela de lançamentos), sem mudança de comportamento para quem usa o sistema. Os demais itens são observações de defesa em profundidade.

**Se eu fosse atacar esse sistema hoje, eu começaria por:** a conta do dono, por senha fraca ou reutilizada. Por isso a verificação em duas etapas (TOTP) entrou nesta fase e está recomendada no perfil do dono.

## Achados por severidade

| # | Matriz | Problema | Severidade | Confiança | Local | Situação |
|---|---|---|---|---|---|---|
| 1 | 5 | `garantir_recebivel` (security definer) exposta por rpc sem checar papel: usuário só leitura criava lançamento | Médio | CONFIRMADO | `supabase/migrations/0015_financeiro.sql:272` | corrigido em `0019_seguranca.sql` |
| 2 | 9 | Sem cabeçalhos de segurança (X-Frame-Options, nosniff, Referrer-Policy, HSTS): painel embutível em iframe de terceiros (clickjacking) | Médio | CONFIRMADO | `erp/next.config.ts` (sem `headers()`) | corrigido |
| 3 | 13 | `shadcn` (CLI) em `dependencies` arrasta `braces` com vulnerabilidade alta (ReDoS) para o `npm audit --omit=dev` | Baixo | CONFIRMADO | `erp/package.json:40` | corrigido (movido para devDependencies, `npm audit fix`) |
| 4 | 9c | `inicio` e `fim` da URL iam ao filtro do banco sem validar: valor inválido derruba a tela com erro 500 | Baixo | CONFIRMADO | `erp/src/app/(painel)/financeiro/lancamentos/page.tsx:48` | corrigido |
| 5 | 7 | Bucket `arquivos-produto` sem lista de MIME e sem checagem de extensão: operador pode subir qualquer arquivo (privado, 100 MB) | Baixo | PROVÁVEL | `erp/src/acoes/produtos/arquivos.ts:70` e `0012_produtos.sql:197` | pendente de decisão |
| 6 | 2 | Servidor MCP usa service role e filtra permissão em cada ferramenta (não pela RLS) | Baixo | CONFIRMADO | `erp/src/mcp/ferramentas.ts:82` | aceito, com teste de cobertura |
| 7 | 6 | Login sem limite próprio de tentativas; depende do limite do Supabase Auth | Baixo | NÃO VERIFICÁVEL | `erp/src/app/(auth)/login/acoes.ts` | observação |

## Detalhamento

```
[MATRIZ 5] Função security definer chamável por qualquer usuário autenticado
Severidade:  Médio
Confiança:   CONFIRMADO
Local:       supabase/migrations/0015_financeiro.sql:272 e :390
Evidência:   create or replace function public.garantir_recebivel(p_pedido uuid) returns uuid
             language plpgsql security definer set search_path = public, pg_temp as $$
             ...
             grant execute on function ... public.garantir_recebivel(uuid) to authenticated, service_role;
Impacto:     Um usuário com papel "leitura" (que não enxerga o financeiro) chama
             supabase.rpc("garantir_recebivel", { p_pedido }) e cria ou atualiza o recebível
             de qualquer pedido pago. Não lê dado; o lançamento é idempotente e usa o valor
             do próprio pedido, por isso o impacto é limitado a escrita indevida.
Correção:    0019_seguranca.sql recria a função com
             if auth.uid() is not null and not app.pode_escrever() then raise exception 'sem_permissao'; end if;
             (gatilho e pg_cron continuam funcionando: operador e dono escrevem; serviço não tem auth.uid()).
```

```
[MATRIZ 9] Sem cabeçalhos de segurança
Severidade:  Médio
Confiança:   CONFIRMADO
Local:       erp/next.config.ts (arquivo inteiro, não havia headers())
Evidência:   const nextConfig: NextConfig = { cacheComponents: false, experimental: {...}, turbopack: {...} };
Impacto:     Qualquer site pode carregar o painel num iframe invisível e induzir cliques em
             "Resolver", "Apagar" ou "Estornar" de quem estiver logado (clickjacking).
             Sem nosniff e Referrer-Policy, o navegador pode interpretar respostas como
             script e vazar a URL completa (com ids) para sites externos.
Correção:    headers() em next.config.ts com X-Frame-Options DENY, X-Content-Type-Options nosniff,
             Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy restritiva e HSTS.
             CSP ficou de fora de propósito: o Next injeta scripts inline e uma CSP mal
             calibrada derruba o painel; fica como próximo passo com nonce.
```

```
[MATRIZ 13] Dependência vulnerável em produção
Severidade:  Baixo
Confiança:   CONFIRMADO
Local:       erp/package.json:40 ("shadcn": "^4.21.4" em dependencies)
Evidência:   npm audit --omit=dev: "braces vulnerable to stack-exhaustion denial of service" (alta),
             via shadcn > @ts-morph/common > fast-glob > braces
Impacto:     O pacote é uma ferramenta de linha de comando que não roda no servidor nem no
             navegador; o risco real é zero em runtime, mas a auditoria de produção fica suja
             e esconde achado futuro.
Correção:    shadcn movido para devDependencies; npm audit fix aplicado; npm audit --omit=dev limpo.
```

```
[MATRIZ 9c] Parâmetros de data da URL sem validação
Severidade:  Baixo
Confiança:   CONFIRMADO
Local:       erp/src/app/(painel)/financeiro/lancamentos/page.tsx:48 e lancamentos/exportar/route.ts
Evidência:   listarLancamentos({ estado, tipo, inicio: f.inicio, fim: f.fim, limite: 1000 })
Impacto:     ?inicio=abc vira .gte("data_prevista", "abc") no PostgREST; o Postgres falha no
             cast e a tela cai com erro genérico. Não é injeção (o valor vai como parâmetro),
             é indisponibilidade da tela por URL manipulada.
Correção:    só aceita AAAA-MM-DD; o resto vira "sem filtro".
```

```
[MATRIZ 7] Upload sem checagem de extensão e MIME
Severidade:  Baixo
Confiança:   PROVÁVEL
Local:       erp/src/acoes/produtos/arquivos.ts:70 a 84; supabase/migrations/0012_produtos.sql:197
Evidência:   bucket = r.data.tipo === "imagem" ? "fotos-produto" : "arquivos-produto";
             ... contentType: arquivo.type || "application/octet-stream"
             ('arquivos-produto', 'arquivos-produto', false, 104857600, null)
Impacto:     Só dono e operador escrevem, o bucket é privado e a leitura é por URL assinada
             de 10 minutos, então não há execução nem entrega pública. O que sobra é alguém
             autenticado ocupar o storage (1 GB no Free) com arquivos que não são STL, 3MF
             ou G-code, e o navegador confiar no MIME informado pelo cliente.
Correção:    (pendente de decisão) validar extensão por tipo (stl, 3mf, gcode) e fixar o
             contentType no servidor por extensão; fotos já têm lista de MIME no bucket.
```

```
[MATRIZ 2] MCP com service role
Severidade:  Baixo
Confiança:   CONFIRMADO
Local:       erp/src/mcp/ferramentas.ts:82 (clienteDe) e erp/src/lib/supabase/admin.ts
Evidência:   return clienteAdmin("mcp", sessao.usuarioId);
Impacto:     As ferramentas MCP consultam o banco com a chave de serviço (sem RLS) e aplicam
             papel e confidencialidade em código (podeLer, visivel). Uma ferramenta nova que
             esqueça a checagem expõe dado que a RLS esconderia. Hoje todas checam e
             testes/integracao/mcp.test.ts cobre leitura, escopo e segredo.
Correção:    aceito como está. Alternativa futura: trocar o token MCP por sessão Supabase
             do usuário (JWT) para a RLS valer também no MCP.
```

```
[MATRIZ 6] Força bruta no login
Severidade:  Baixo
Confiança:   NÃO VERIFICÁVEL
Local:       erp/src/app/(auth)/login/acoes.ts
Evidência:   signInWithPassword sem contador próprio de tentativas
Impacto:     Depende do limite do Supabase Auth (configurado no painel, por IP e por e-mail).
Correção:    manter o limite do Supabase ativo; ativar MFA no dono (feito nesta fase);
             considerar captcha do Supabase se houver tentativas suspeitas na auditoria de auth.
```

## Matrizes verificadas sem achado

- **1 Segredos:** `.env` e `erp/.env.local` ignorados e ausentes do histórico (`git log --all` só tem os `.env.example`); nenhuma chave em arquivo versionado; CI falha se `service_role` aparecer em `.next/static`; MCP guarda só o SHA-256 do token e mostra o valor uma vez.
- **4 Condições de corrida:** `realizar_lancamento`, `cancelar_lancamento`, `estornar_lancamento`, `movimentar_estoque`, `confirmar_compra` e `concluir_ordem_producao` travam a linha com `for update`; idempotência por índice único em lançamentos, importações, recorrências e alertas.
- **5 RLS:** todas as 50 tabelas com RLS; views com `security_invoker`; financeiro só dono; `auditoria` só dono; `usuario_da_requisicao` aceita `x-usuario-id` só com role de serviço.
- **8 SSRF:** nenhum `fetch` no servidor com URL do usuário; links do planejamento só http(s) e abrem com `rel="noreferrer noopener"`.
- **9a/9b Sessão e XSS:** cookies da sessão pelo `@supabase/ssr` (httpOnly); `voltar` só aceita caminho relativo sem `//`; Markdown com `skipHtml`; nenhum `dangerouslySetInnerHTML`; exportação CSV e XLSX neutraliza fórmula.
- **12 Cache cross-tenant:** sistema de um só inquilino; `cache()` do React é por request; sem `unstable_cache`.

## Não aplica

- **3 Webhooks:** nenhum endpoint recebe chamada de terceiros.
- **10 WebSockets e realtime:** não usados.
- **11 Assinaturas e cobrança:** não há cobrança no sistema.
- **14 Extração de prompt e jailbreak:** o sistema não embute modelo de linguagem; o MCP só devolve dados.

## Não verificável daqui

- Limites de taxa e proteção de senha do Supabase Auth (painel do projeto).
- Configuração de TLS e domínio do host (ainda não implantado; ver `erp/docs/implantacao.md`).
- Chaves do Supabase rotacionadas desde a criação do projeto (painel).

## Ordem de correção recomendada

1. Feito: `0019_seguranca.sql`, cabeçalhos, `shadcn` em devDependencies, validação de datas.
2. Ativar a verificação em duas etapas no perfil do dono assim que o sistema for publicado.
3. Decidir sobre a checagem de extensão no upload de arquivos do produto (achado 5).
4. Próximo ciclo: CSP com nonce; token MCP ligado à sessão do usuário.
