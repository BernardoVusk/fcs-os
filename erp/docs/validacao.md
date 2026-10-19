# Validação (Fase 10): critérios da seção 14 da spec

Conferido em 12/10/2026, na branch `erp-fase-1`, com `npm run lint`, `npm run typecheck`, `npm test` (123 unitários), `npm run test:integracao` (49, projeto `fcs-os-teste`), `npm run e2e` (22 fluxos, servidor local, inclusive upload direto de 6 MB) e `npm run build` verdes.

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
| 14 | CI verde, backup semanal com restauração testada, docs e `CLAUDE.md` atualizados, nenhum segredo versionado | parcial | CI em `.github/workflows/ci.yml` (verde em `main` desde 431e4e2); publicado em https://fcs-erp.vercel.app em 12/10/2026; backup em `.github/workflows/backup.yml` escrito, **ainda não executado** (depende do `/salvar` e dos segredos no GitHub; a primeira execução com `RESTAURAR` é o teste de restauração pendente, ver `docs/backups-e-recuperacao.md`); auditoria de segurança em `saidas/seguranca/2026-10-12-auditoria.md` sem achado crítico ou alto |

## O que ficou de fora da spec e por quê

- Importação de perfil de fatiador (3MF/G-code), item opcional da Fase 9: não feita.
- Hospedagem e domínio (D4): Vercel, decidido em 12/10/2026; repositório pronto (`vercel.json`, upload direto ao Storage por causa do limite de 4,5 MB, `maxDuration`); criar o projeto e o domínio é do usuário (`docs/implantacao.md`).
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

## Grupos de Ofertas (Fases 11 a 19): critérios de aceite do plano

Conferido em 18/10/2026, na branch `erp-ofertas`, com `npm run lint`, `npm run typecheck` (ERP e worker), `npm test` (230 unitários, inclusive os do worker), `npm run build` (ERP e pacote do worker), `npm run test:integracao` (89 de 93; as 4 falhas são a sobra de `parametros_custo` v44 no projeto de teste, em `alertas`, `custos` e `producao`, anterior ao módulo) e `npm run e2e` (33 fluxos, 8 deles do módulo).

| Fase | Critério | Situação | Evidência |
|---|---|---|---|
| 11 | Painel sem dado fictício; papéis testados; cifra com teste de adulteração; SSRF recusado | feito | `src/lib/cripto.test.ts`, `src/integracoes/http.test.ts`, `src/lib/auth/papeis.test.ts`, `testes/integracao/ofertas-fundacao.test.ts`; painel com "Sem dados" e "não disponível" nas capturas |
| 12 | "Conectada" só depois de chamada real; segredo nunca volta; assinatura da Shopee com vetor fixo | feito no código, **sem teste real** | `src/integracoes/conversor.test.ts` (assinatura, erro vira motivo), e2e "segredo nunca aparece na página"; a conexão real com Shopee e Awin depende das credenciais do usuário |
| 13 | Operação completa à mão sem WhatsApp; "não informado" em campo sem fonte; dado desatualizado avisado; cupom vencido bloqueado | feito | `testes/e2e/ofertas.spec.ts` (oferta do Mercado Livre até o rascunho, Publicar assistido, cupom vencido), `testes/integracao/ofertas-publicacao.test.ts` |
| 14 | Tela reflete a sessão real; desconexão abre alerta; nada de QR ou sessão em log; evasão com nulos e lacunas | feito no código, **spike real pendente** | `worker/src/sessoes.test.ts` (conector falso), `testes/integracao/ofertas-whatsapp.test.ts` (aceite de risco, trava do número, QR só dono, papel do worker, alertas de número desconectado e worker parado), `src/dominio/ofertas/evasao.test.ts`, `worker/src/log.ts`; conexão por QR com número dedicado e grupo de teste não foi feita |
| 15 | Duas reservas paralelas nunca pegam o mesmo envio; retentativa não duplica; agenda, janela e limites respeitados | feito | `testes/integracao/ofertas-fila.test.ts` (reservas simultâneas, reserva vencida com e sem despacho, limite por hora, janela, rodadas), `worker/src/despacho.test.ts` |
| 16 | Link não elegível não sai; link da origem nunca sai; informação essencial preservada | feito | `src/dominio/ofertas/copiador.test.ts`, `limpeza.test.ts`, `worker/src/copiador.test.ts`, `testes/integracao/ofertas-copiador.test.ts` (duplicidade, origem autorizada) |
| 17 | Validade visível; "validade não confirmada" no cupom sem data | feito | `src/dominio/ofertas/cupons.test.ts`, `testes/integracao/ofertas-cupons.test.ts` (registro idempotente dos cupons da Awin, regra da fila, alerta de vencimento) |
| 18 | Envio, clique e conversão separados; origem e data de cada número | feito | `testes/integracao/ofertas-relatorios.test.ts` (atribuição, arquivo repetido, papel leitura), `src/dominio/ofertas/conversoes.test.ts`, e2e de relatórios e histórico |
| 19 | Auditoria sem achado alto aberto; capturas nos dois temas; guia confere com as telas | feito | `saidas/seguranca/2026-10-18-auditoria.md` (0 crítico, 0 alto, 0 médio, 4 baixos, correções aguardando decisão); capturas das 12 telas em `testes/relatorios/capturas/` (1440, 1024 e 390, escuro e claro); `docs/GUIA_CONFIGURACAO_INTEGRACOES.md` escrito a partir do inventário de rótulos das telas; valor da chave de cifra e da service role ausentes de `.next/static` |

Ficou de fora desta entrega, por depender de terceiros: conexão real com a Open API da Shopee e com a Awin, spike com número dedicado e deploy do worker na Fly, Creators API da Amazon e feeds da Awin. A lista completa está na seção 12 do guia.
