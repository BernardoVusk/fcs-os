# Grupos de Ofertas (Fases 11 a 19): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Módulo dentro do ERP para operar grupos de WhatsApp de ofertas com links de afiliado (Shopee, Mercado Livre, Amazon, Awin): integrações com segredo cifrado, gerador de oferta, modelos, modo assistido, números e grupos, fila com despacho idempotente, copiador de grupos autorizados, cupons, relatórios e histórico.

**Architecture:** Telas e actions no ERP (Vercel); worker próprio em `erp/worker/` (Node 22 + Baileys, Fly.io gru) que fala com o WhatsApp e conversa com o ERP só pelo banco (tabelas `ofe_*` como barramento, papel Postgres `ofe_worker`). Adaptadores HTTP de afiliado em `src/integracoes/`, compartilhados pelo ERP e pelo worker. Cifra AES-256-GCM em `src/lib/cripto.ts`.

**Tech Stack:** o do ERP. Novas dependências só no worker (`baileys` em versão exata, `pg`, `qrcode`, `esbuild`).

Spec: `docs/superpowers/specs/2026-10-18-grupos-de-ofertas-design.md`.

## Regras fixadas

- Nunca publicar link sem afiliação: conversão falhou e não há link manual = envio `falhou` com motivo.
- Nenhum número inventado: campo sem fonte fica nulo e a tela mostra "não informado" ou "Sem dados"; visualizações são sempre "não disponível pela integração".
- Segredo nunca volta ao navegador nem ao log; só `integracoes/credenciais.ts` decifra.
- `app.auditar()` só em cadastro; nunca em segredo, sessão, QR, comando, estado, envio, tentativa, medição, evento ou mensagem de origem.
- RPC do worker: `security invoker`, `revoke ... from public, anon, authenticated`, `grant ... to ofe_worker`.
- e2e só lê e usa modo manual; nunca salva credencial nem cria envio automático.
- Cadência é configuração operacional, sem rotação de número e sem promessa de evitar bloqueio.
- Plataforma com trava de conformidade fechada só gera rascunho.

## Fases e tarefas

### Fase 11: fundação
1. `papeis.ts` (área `ofertas`, `/ofertas/integracoes` como `usuarios`), navegação, ícones, rótulos.
2. `lib/cripto.ts` com teste (ida e volta, adulteração, contexto, chave anterior).
3. `integracoes/http.ts` com teste (https, lista de hosts, IP privado, saltos).
4. Migração 0021: integrações, segredos, modelos com padrões, `ofe_gerar_alertas`, cron, papel `ofe_worker`, origem `worker`.
5. Painel `/ofertas` com estados honestos; docs (arquitetura, variáveis, regras).

### Fase 12: integrações de afiliados
1. Domínio: plataformas, metadados de cada integração, campos públicos e secretos.
2. Adaptadores Shopee (assinatura, `generateShortLink`, `productOfferV2`), Awin (Link Builder, programas), Amazon (tag), ML (manual).
3. Migração 0022 (`ofe_awin_anunciantes`), RPC de gravação do segredo.
4. Tela Integrações de afiliados: salvar, testar conexão, testar conversão, status, último erro, trava de conformidade.
5. Guia: seção das integrações.

### Fase 13: oferta, modelos, cupons manuais e modo assistido
1. Domínio: URL e plataforma, links de afiliado, modelos (variáveis e seções), limpeza, status derivado, cupons.
2. Migração 0023: grupos manuais, cupons, ofertas, links, publicações, envios, visão de status, `ofe_marcar_publicado`, bucket.
3. Telas Gerar oferta, Modelos, Publicar, Grupos (manual), Cupons.

### Fase 14: WhatsApp, números e grupos
1. Migração 0024: números, estado, sessões, QR, comandos, eventos, worker, medições, eventos de grupo, lacunas.
2. Worker: conector Baileys e falso, estado de autenticação cifrado, comandos, ingestão, trava por número, batimento.
3. Telas Números e Grupos (sincronizados, métricas, evasão).

### Fase 15: fila e despacho
1. Migração 0025: filas, destinos, itens, tentativas, reservar, concluir, enfileirar, rotina diária.
2. Domínio: cadência, janela e fuso, CSV da Shopee.
3. Worker: preparo e despacho.
4. Tela Filas (prévia do lote, Falhas e incertos).

### Fase 16: copiador
1. Migração 0026: automações, destinos, mensagens de origem, `ofe_enfileirar_mensagem`.
2. Domínio: pipeline e duplicidade. Worker: copiador.
3. Tela Copiador.

### Fase 17: cupons automáticos
1. Migração 0027: sincronização Awin, cupom vencendo nos alertas.
2. Worker e action de sincronização.

### Fase 18: relatórios e histórico
1. Migração 0028: importações, conversões, cliques importados, visões.
2. Importação Shopee e Awin por API e CSV; exportação; telas Relatórios e Histórico.

### Fase 19: endurecimento e guia
1. `/auditoria-seguranca`, capturas, `docs/validacao.md`, guia final.
