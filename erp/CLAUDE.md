# FCS ERP: instruções permanentes

Aplicação Next.js 16 do sistema de gestão da FCS 3D STUDIO. Spec aprovada: `docs/superpowers/specs/2026-10-11-erp-fcs-design.md`. Plano da fase em andamento em `docs/superpowers/plans/`. Antes de propor mudança de arquitetura, ler `docs/arquitetura.md` e consultar a base de conhecimento pelo MCP `fcs-erp` (`kb_decisoes` com o módulo e `kb_buscar` com o tema) ou pela skill `/kb-buscar`. Ao concluir tarefa que gerou decisão ou solução não trivial, perguntar se salva com `/kb-salvar` ou `/kb-decisao`. Detalhes em `docs/integracao-claude-code.md`.

## Comandos

`npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integracao` (projeto de teste), `npm run e2e`, `npm run migrar -- --alvo dev|teste`, `npm run tipos`, `node ferramentas/otimizar-fotos-sorteio.mjs <pasta>` (fotos do carrossel da página pública), `node ferramentas/importar-catalogo.mjs <catalogo.json> --alvo dev|teste` (catálogo público a partir da coleta no MakerWorld), `npm run formatar` (rodar antes de commitar; toda a base já está formatada), `node ferramentas/sql.mjs "select ..."`.

## Regras de camadas

- `src/dominio/`: regras puras, sem React, Next ou Supabase. Toda fórmula com teste ao lado e documentada em `docs/formulas-de-custo.md` ou `docs/regras-de-negocio.md`.
- `src/acoes/`: server actions, sempre `exigirEscrita(area)` antes de qualquer coisa, zod depois, `revalidatePath` no fim. Arquivo `"use server"` só exporta funções assíncronas; constantes vão para `dominio/`.
- `src/dados/`: só consultas, `import "server-only"`, cliente com sessão (`clienteServidor`). Service role só em `lib/supabase/admin.ts` e `ferramentas/`.
- `src/app/`: composição. Nenhuma regra de negócio em componente.
- Exceção única às duas regras acima: `acoes/publico/` e `dados/publico/` servem as páginas públicas `/sorteio` e `/portfolio` sem sessão; a escrita passa por limite por IP, campo armadilha, zod e `rpc` pela service role a `inscrever_sorteio`, executável só por `service_role`; a leitura é só id e nome de produtos ativos e, no catálogo, nome, slug e foto de categorias e itens ativos. Nada mais entra nessas pastas sem decisão registrada. As páginas têm cores fixas (não seguem o cookie de tema) e não usam `Campo` nem `SelectNativo`.

## Banco

- Migração nova = arquivo `supabase/migrations/NNNN_nome.sql` na raiz do repositório, aplicado em dev e em teste (`npm run migrar -- --alvo dev` e `--alvo teste`), seguido de `npm run tipos`. Nunca editar migração aplicada.
- Toda tabela nasce com RLS e, se for cadastro, com trigger `app.auditar()`.
- Nunca inventar número: campo sem dado real fica nulo e a tela mostra "Sem dados" ou "Não configurado".
- O PostgREST roda com `safeupdate`: todo UPDATE ou DELETE precisa de WHERE, inclusive em tabela temporária dentro de função (`where true` resolve). A Management API, usada pelo `migrar.mjs`, não tem essa trava, então o erro só aparece em runtime.
- Em plpgsql, `text[] || 'literal'` é lido como concatenação de arrays e falha com "malformed array literal"; usar `array_append`.
- Parâmetro com default só depois dos obrigatórios. Para tornar opcional um parâmetro de função já aplicada, nova migração com `drop function` e `create` na nova ordem; o PostgREST chama por nome, então a ordem não afeta o código.
- Escrita em mais de uma tabela (confirmar compra, movimentar estoque, estornar) é função SQL `security invoker` chamada por `rpc`, nunca várias chamadas da aplicação.
- Gatilho que escreve em tabela que o usuário da sessão não enxerga (operador confirma compra, o pagável é só do dono) é `security definer` com `search_path` fixo; função chamada pela tela continua `security invoker`.
- Sequência criada no schema `app` precisa de `grant usage, select ... to authenticated, service_role`, senão o insert falha com "permission denied for sequence" só em runtime.
- Constante exportada de arquivo `"use client"` vira referência de cliente quando importada por componente de servidor (objeto chega como undefined): mapas de rótulos e status ficam em `src/dominio/`.
- Valores numéricos em `defaultValue` de input usam `numeroParaCampo` (sem separador de milhar); `formatarNumero` é só para exibir.

## Padrões

- Português em código, rotas, tabelas e textos. Sem emoji. Sem travessão.
- Erros de validação são chaves traduzidas por `erroPt()` (`src/lib/erros-pt.ts`).
- Percentual digitado em por cento, guardado como fração.
- Dinheiro e custo em decimal (`decimal.js` no domínio, `numeric` no banco), nunca float em cálculo.
- Comandos de shell com mais de 8 KB falham no Windows: escrever arquivos grandes em partes. Python lendo stdin no Windows usa cp1252: rodar com `python -X utf8` quando o script tem acento.
- Função passada de componente de servidor para componente de cliente precisa ser server action ou `acao.bind(null, id)`; arrow inline derruba a página com "server error".

## Áreas críticas

Permissões (`lib/auth/papeis.ts` e policies), auditoria (`app.auditar`), servidor MCP (`src/mcp/`, escopos e filtro de segredos), motor de custos (`src/dominio/custos`, `src/dominio/precos`, `docs/formulas-de-custo.md`), estoque (funções SQL de 0007 a 0009), produção (`concluir_ordem_producao` e `reabrir_ordem_producao` em 0013), pedidos (`mudar_status_pedido` em 0014), financeiro (`realizar_lancamento`, `cancelar_lancamento`, `estornar_lancamento`, `garantir_recebivel` e os gatilhos de 0015), planejamento (`validar_item_plano` e `historico_item_plano` em 0016), sorteio (`inscrever_sorteio` e `realizar_sorteio` em 0020), alertas (`gerar_alertas` em 0017, job do pg_cron em 0018), exportação (`dominio/relatorios/{csv,xlsx}.ts`). Mudança nessas áreas exige teste de integração novo.

## Segurança e sessão

- Verificação em duas etapas (TOTP do Supabase): quem tem fator verificado precisa de AAL2; o proxy lê o claim `aal` do JWT, `exigirLeitura` redireciona para `/login/verificar` e `exigirEscrita` lança `mfa_pendente`. Nunca remover fator sem o código atual.
- Hospedagem: Vercel (Pro). Corpo de requisição limitado a 4,5 MB: arquivo nunca passa por server action; sobe direto do navegador ao Storage por URL assinada (`acoes/upload.ts` assina, `lib/upload-cliente.ts` envia, `dados/storage.ts` confere) e a action registra só metadados. Rota que pode passar de 10 s declara `export const maxDuration = 60`. Passos em `docs/implantacao.md`.
- Cabeçalhos de segurança ficam em `next.config.ts` (sem CSP por enquanto). Função `security definer` exposta por rpc precisa checar papel dentro dela (`0019_seguranca.sql`).
- Auditoria de segurança: `/auditoria-seguranca` com relatório em `saidas/seguranca/`; achados e pendências em `docs/validacao.md`.
- Revisão visual: `node ferramentas/capturas.mjs` gera capturas nos dois temas e três larguras em `testes/relatorios/capturas/` (ignorado pelo git).

## Antes de dizer que terminou

`npm run lint && npm run typecheck && npm test && npm run build`. Se tocou em banco ou permissão, `npm run test:integracao`. Se tocou em tela, `npm run e2e`. Implantação e backup: `docs/implantacao.md` e `docs/backups-e-recuperacao.md`.
