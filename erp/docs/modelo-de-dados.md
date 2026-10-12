# Modelo de dados (Fases 1 e 2)

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
| `conhecimentos` | título, resumo, conteúdo (markdown), tipo, categoria, tags, módulo, origem, referência, confidencialidade, estrutura (decisão), validado, status, versão, `busca` (tsvector `app.pt`) | ativo: interno para todos, restrito só dono | dono e operador |
| `conhecimentos_versoes` | estado anterior a cada alteração, com autor, origem e motivo (`x-motivo`) | quem lê o registro | trigger |
| `conhecimentos_relacoes` | relacionado, substitui, deriva_de | todo usuário ativo | dono e operador |
| `conhecimentos_anexos` | arquivos no bucket privado `anexos-conhecimento` (10 MB) | quem lê o registro | dono e operador |

Funções: `app.normalizar(texto)`, `app.papel_atual()`, `app.eh_dono()`, `app.pode_escrever()`, `app.usuario_ativo()`, `app.origem_atual()`, `app.usuario_da_requisicao()` (sessão ou cabeçalho `x-usuario-id` pela service role), `app.motivo_atual()`, `app.auditar([coluna_chave])`, `app.versionar_conhecimento()`, `app.conhecimento_busca(...)`, `public.buscar_global(termo, tipos, limite)` com ramos canal, categoria, unidade e conhecimento. Configuração de busca `app.pt` (português sem acento).

As tabelas das fases seguintes estão na spec (`docs/superpowers/specs/2026-10-11-erp-fcs-design.md`, seção 5) e entram aqui conforme forem criadas.
