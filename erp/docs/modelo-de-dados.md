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

Funções: `app.normalizar(texto)`, `app.papel_atual()`, `app.eh_dono()`, `app.pode_escrever()`, `app.usuario_ativo()`, `app.origem_atual()`, `app.auditar([coluna_chave])`, `public.buscar_global(termo, tipos, limite)`.

As tabelas das fases seguintes estão na spec (`docs/superpowers/specs/2026-10-11-erp-fcs-design.md`, seção 5) e entram aqui conforme forem criadas.
