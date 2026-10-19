# Testes

- Unitários (`npm test`): Vitest, arquivos `*.test.ts` ao lado do código. Cobrem domínio, papéis, formatos, navegação, formulários e as ferramentas de migração. Rodam no CI.
- Integração (`npm run test:integracao`): Vitest contra o projeto `fcs-os-teste`, usuários criados e removidos pelo próprio teste. Cobrem RLS por papel, auditoria com origem e busca global. Só local (precisam de segredo).
- E2E (`npm run e2e`): Playwright contra `npm run dev` com um usuário dono real (`E2E_EMAIL` e `E2E_SENHA` em `erp/.env.local`). Cobrem login, navegação, tema, criação e busca de categoria, a página pública `/sorteio` sem login e ausência de rolagem horizontal em 1440, 1024 e 390 px. Capturas em `testes/relatorios/capturas/`.

## Grupos de Ofertas

- Unitários do domínio em `src/dominio/ofertas/*.test.ts` (plataforma e URL, links de afiliado, modelos, limpeza, cupons, fila, copiador, evasão, conversões), `src/lib/cripto.test.ts` (ida e volta, adulteração, contexto, troca de chave) e `src/integracoes/*.test.ts` (`http.test.ts`: IP privado, salto para host fora da lista, tamanho; `conversor.test.ts`: assinatura da Shopee, sub IDs, clickref da Awin, tag da Amazon, link do portal do Mercado Livre, erro da API vira motivo e nunca o link original, com `fetch` falso; `preparo.test.ts`). Nenhum teste chama a API real da Shopee nem da Awin.
- Worker (`worker/src/*.test.ts`, no mesmo `npm test`): conector falso no lugar da Baileys; comandos, sessões e travas, preparação e despacho, pausa por desconexão, copiador de ponta a ponta.
- Integração (`testes/integracao/ofertas-*.test.ts`): RLS de cada tabela por papel (segredo e sessão invisíveis, QR só dono, texto de origem só para quem escreve), papel `ofe_worker` sem acesso fora do módulo e com origem `worker` na auditoria, duas reservas simultâneas, reserva vencida com e sem despacho iniciado, retentativa e limite, número desconectado, janela, cupom vencido, rodadas, copiador com duplicidade, cupons da Awin, relatórios com arquivo repetido. Os testes do worker entram com o login real do `ofe_worker` pelo pooler (`SUPABASE_TESTE_WORKER_DB_URL`, gerada por `node ferramentas/papel-worker.mjs --alvo teste`).
- E2E (`testes/e2e/ofertas.spec.ts`): roda no banco dev, que é produção, por isso só lê e usa o modo manual, com dados sintéticos apagados no fim; nunca salva credencial nem cria envio automático. Cobre painel e integrações sem segredo na página, oferta do Mercado Livre à mão até o rascunho, Publicar assistido marcado uma vez, cupom vencido, números e grupo com visualizações "não disponível", fila manual, copiador e relatórios com histórico.
- O worker real (Baileys) não tem teste automático: a conexão com o WhatsApp só se confere com número dedicado e grupo de teste (`docs/implantacao.md`, seção do worker).

Regra: função nova no domínio nasce com teste; migração nova que muda permissão ganha caso em `rls.test.ts`; tela nova ganha pelo menos um fluxo e2e.
