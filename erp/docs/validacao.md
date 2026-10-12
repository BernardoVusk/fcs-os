# Validação (Fase 10): critérios da seção 14 da spec

Conferido em 12/10/2026, na branch `erp-fase-1`, com `npm run lint`, `npm run typecheck`, `npm test` (123 unitários), `npm run test:integracao` (49, projeto `fcs-os-teste`), `npm run e2e` (20 fluxos, servidor local) e `npm run build` verdes.

| # | Critério | Situação | Evidência |
|---|---|---|---|
| 1 | Login, papéis e RLS; `leitura` não escreve por tela nem por MCP | feito | `testes/integracao/rls.test.ts`, `mcp.test.ts` (papel leitura recusado em `kb_salvar`), `planejamento.test.ts` e `financeiro.test.ts` (leitura não escreve, operador não apaga); MFA do dono em `testes/e2e/mfa.spec.ts` |
| 2 | Rolo com preço, frete e desconto mostra custo por grama; compra posterior atualiza média e último custo | feito | `testes/integracao/estoque.test.ts` (casos B1 e B2 do Anexo A), `testes/e2e/estoque.spec.ts` |
| 3 | Calculadora reproduz a tabela de casos, recusa inviável e diferencia markup de margem | feito | `src/dominio/custos/*.test.ts` lendo `docs/formulas-de-custo.md`, `testes/e2e/precificacao.spec.ts` (47,49 e 71,71 na tela) |
| 4 | Mudar custo de insumo marca produtos e lista os abaixo da margem, sem alterar cálculos salvos | feito | `testes/integracao/custos.test.ts` e `producao.test.ts` (alerta `margem_reduzida`, snapshot imutável) |
| 5 | Concluir ordem gera movimentações, custo realizado e peça pronta numa transação; estoque nunca negativo sem override | feito | `testes/integracao/producao.test.ts`, `estoque.test.ts` (override só em consumo, com justificativa e alerta) |
| 6 | Pedido pago gera exatamente um recebível; reimportar não duplica; cancelar reverte | feito | `testes/integracao/financeiro.test.ts` (um só recebível, `garantir_recebivel` idempotente, cancelamento), `vendas.test.ts` (importação por hash) |
| 7 | Painel financeiro separa planejado, parcial e realizado; projeção não conta duas vezes; DRE sem a compra de filamento | feito | `src/dominio/financeiro/financeiro.test.ts` (invariante caixa mais projetado, DRE exclui `embutido_no_custo`), tela `/financeiro` |
| 8 | Busca global devolve insumo, lotes, produtos, compras e conhecimentos agrupados, respeitando permissão | feito | `testes/integracao/busca.test.ts`, ramos até lançamento (só dono) e item do planejamento |
| 9 | Do Claude Code: `/kb-buscar` encontra, `/kb-salvar` grava com origem, segredo recusado, token revogado rejeitado | feito | `testes/integracao/mcp.test.ts` (onze ferramentas, escopo, segredo, token), `docs/conhecimento-fase-*.json` gravados pelo próprio MCP |
| 10 | Calendário, quadro e lista mostram os mesmos itens; recorrência e modelos; item ligado a produto | feito | `src/dominio/planejamento/planejamento.test.ts`, `testes/integracao/planejamento.test.ts`, `testes/e2e/planejamento.spec.ts` |
| 11 | Dashboard só com dados reais; semente de demonstração removida | feito | nunca houve seed de demonstração; linhas deixadas por e2e interrompidos foram removidas do banco de dev em 12/10/2026; cartões mostram "Sem dados" |
| 12 | Layout em 1440, 1024 e 390 nos fluxos principais; foco visível; contraste AA | feito com ressalva | `testes/e2e/responsivo.spec.ts`; capturas em `testes/relatorios/capturas/` (`node ferramentas/capturas.mjs`) revisadas nos dois temas; contraste conferido só nos tokens (`docs/design-system.md`), sem ferramenta automática de acessibilidade |
| 13 | CSV e XLSX reabrem com acento e sem fórmula injetada | feito | `src/dominio/relatorios/relatorios.test.ts` (BOM, apóstrofo em fórmula, zip legível), `testes/e2e/relatorios.spec.ts` |
| 14 | CI verde, backup semanal com restauração testada, docs e `CLAUDE.md` atualizados, nenhum segredo versionado | parcial | CI em `.github/workflows/ci.yml`; backup em `.github/workflows/backup.yml` escrito, **ainda não executado** (depende do `/salvar` e dos segredos no GitHub; a primeira execução com `RESTAURAR` é o teste de restauração pendente, ver `docs/backups-e-recuperacao.md`); auditoria de segurança em `saidas/seguranca/2026-10-12-auditoria.md` sem achado crítico ou alto |

## O que ficou de fora da spec e por quê

- Importação de perfil de fatiador (3MF/G-code), item opcional da Fase 9: não feita.
- Hospedagem e domínio (D4): decisão do usuário; repositório pronto para Vercel e Netlify (`docs/implantacao.md`).
- Checagem de extensão no upload de arquivos do produto (achado baixo da auditoria): pendente de decisão.
- CSP com nonce: próximo ciclo.

## Como repetir a validação

```
cd erp
npm run lint && npm run typecheck && npm test && npm run build
npm run test:integracao
npm run e2e
node ferramentas/capturas.mjs
```
