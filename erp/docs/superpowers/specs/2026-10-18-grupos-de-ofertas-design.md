# Grupos de Ofertas: spec do módulo

> Aprovada em 18/10/2026 (Plan Mode). Pedido original: prompt_claude_code_grupos_de_ofertas.md. Plano de execução: docs/superpowers/plans/2026-10-18-grupos-de-ofertas.md.

## Context

A empresa usa tráfego pago para levar pessoas a grupos de WhatsApp de ofertas e publica ali produtos e cupons com links de afiliado (Shopee, Mercado Livre, Amazon, Awin). Hoje tudo é manual. O pedido (`prompt_claude_code_grupos_de_ofertas.md`) é um módulo dentro do sistema existente, o FCS ERP (`erp/`, Next.js 16 + Supabase, em fcs-erp.vercel.app), que centralize integrações, conversão de links, geração e fila de ofertas, copiador de grupos autorizados, cupons, modelos de mensagem, acompanhamento dos grupos e relatórios. Sem inventar dado, sem expor segredo e sem esconder limitação de API.

Restrição de negócio: operação de uma pessoa só. Cada fase entrega algo usável sozinha, e o modo assistido funciona antes de qualquer automação.

**Decisão do usuário (18/10/2026):** base em **modo assistido** (o sistema monta a postagem, você publica com um toque) e automação opcional com **worker próprio (Baileys) na Fly.io São Paulo**, ligada por número com aceite de risco registrado, só em números dedicados.

---

## 1. Sistema atual (o que se reaproveita)

- **Stack:** Next 16.4, React 19.3, @supabase/ssr, zod 4, Tailwind 4 + shadcn (radix), TanStack Table, sonner, decimal.js, date-fns/tz. Testes: vitest (unitário; integração no projeto `fcs-os-teste`), Playwright (e2e contra o banco dev, que é produção). Não há biblioteca de gráfico, fila, cifra nem HTTP de saída.
- **Camadas (`erp/CLAUDE.md`):** `src/dominio` puro com teste ao lado; `src/acoes` com `exigirEscrita(area)` + zod + `revalidatePath`; `src/dados` com `server-only` e `clienteServidor`; service role só em `lib/supabase/admin.ts` e `ferramentas/`; mapas de rótulo em `dominio/`.
- **Permissões:** `lib/auth/papeis.ts` (dono, operador, leitura; `AREAS`; `areaDaRota` com caso especial para `/configuracoes/usuarios`), guardas em `lib/auth/sessao.ts`, RLS com `app.usuario_ativo()`, `app.pode_escrever()`, `app.eh_dono()`, MFA AAL2 no proxy. "Só dono" no ERP = área `usuarios`.
- **Banco:** tabelas em `public` (tipos gerados só desse schema), funções em `app`, pt-BR snake_case, uuid, `criado_em`/`atualizado_em` (`app.carimbar_atualizacao`), check em vez de enum, `app.auditar()` em cadastro (copia a linha inteira para `auditoria`), `alertas` com um aberto por tipo e entidade, pg_cron em `0018_cron_alertas.sql` (DO com `unschedule` antes), RPC só de `service_role` com `revoke ... from public, anon, authenticated` como em `0020_sorteio.sql`, regra de `0019_seguranca.sql` para `security definer`. Prefixo por módulo já existe (`plan_*`): o novo usa **`ofe_`**. Próxima migração: **0021**.
- **Reaproveitar:** `TabelaDados`, `CartaoIndicador`, `BotaoAcao`, `DialogoNovo`, `Campo`, `SelectNativo`, `Banner`, `EstadoVazio`, `SeletorPeriodo`, `Icone`; `lib/forms.ts`, `lib/erros-pt.ts`, `lib/limite.ts` (`Limitador`); upload por URL assinada (`acoes/upload.ts`, `lib/upload-cliente.ts`, `dados/storage.ts`); padrão de token exibido uma vez (`acoes/integracoes.ts`); `dominio/conhecimento/segredos.ts` (`contemSegredo`); idempotência por hash de arquivo (`dominio/vendas/importacao-pedidos.ts`); `dominio/relatorios/csv.ts`; alertas (`dados/alertas.ts`: `TIPO_ALERTA_ROTULO`, `rotaDaEntidade`); parser de URL da Shopee `mini-projetos/fcs-spy/extensao/src/shopee/url.ts` (`idDaUrl`) portado para o domínio.
- **Pendências herdadas:** Vercel ainda no Hobby (proíbe uso comercial, cron 1x/dia); Supabase Free (pausa após 7 dias parado, sem backup próprio); sobra de `parametros_custo` v44 no projeto de teste derruba 4 testes de integração; MCP `fcs-erp` fora do ar nesta sessão (base de decisões não consultada).

## 2. Matriz de viabilidade (verificada em 18/10/2026)

V = viável · VR = viável com restrições · DA = depende de aprovação/credencial · NC = não confirmada ou não disponível

| Função | Método | Classe | Observação |
|---|---|---|---|
| **WhatsApp:** grupos existentes pela API oficial | Groups API da Cloud API | NC | Máx. 8 participantes, exige OBA, não vale para número do app nem coexistência |
| Conectar (QR ou código de pareamento), listar grupos, membros, entradas e saídas, ler origem, enviar imagem + legenda | Baileys em worker próprio | VR | Viola os Termos ("uso não pessoal", "mensagens automáticas"); risco de banimento; processo persistente fora da Vercel |
| Visualizações por mensagem em grupo | qualquer | NC | Recibo por usuário existe na Baileys, sem completude e com problema de LGPD: "não disponível pela integração" |
| **Shopee:** link com subIds (até 5) | Open API GraphQL `generateShortLink` | DA | AppID + Secret após aprovação; assinatura SHA256 |
| Shopee: dados de produto | `productOfferV2` | DA | Nome, imagem, preço mín/máx, % desconto, nota, vendas. Sem preço anterior explícito, pix, parcelas, nº de avaliações |
| Shopee: conversões por subId | `conversionReport` / `validatedReport` | DA | Página de 500, janela ~90 dias (fonte de terceiro) |
| Shopee: CSV de links em massa | Portal "Oferta de Produto" > "Obter Link" (coluna "Offer Link") | V | Demais colunas não documentadas: mapear a partir de arquivo real |
| **Mercado Livre:** gerar link | Só manual no portal (gerador, etiquetas) | V manual / NC API | Uso indevido de robô não é comissionado (termos 3.1.2c) |
| ML: dados de produto | API exige OAuth, relatos de 403 | NC | Cadastro manual |
| ML: canais | Grupo público de WhatsApp permitido, canal cadastrado antes, sem disparo massivo | VR | Encurtador e redirecionamento próprio proibidos (1.8, 1.10) |
| **Amazon:** link | Parâmetro `tag` com ID de associado ou de rastreamento (até 100) | V | URL montada de forma determinística |
| Amazon: dados de produto | Creators API (PA-API 5 desligada em 2026) | DA | 10 vendas em 30 dias; 1 TPS no início; preço com data/hora + aviso, cache até 24 h, imagem não armazenada |
| Amazon: publicar em grupo de WhatsApp | Política | NC / alto risco | Mensagens só se solicitadas; página antiga dizia que WhatsApp não vale. Redirecionador próprio proibido (6v, 6w) |
| **Awin:** link com clickref | Link Builder API (lote de 100, curto tidd.ly) | V | Token do publisher; parceria com o anunciante; 20 chamadas/min |
| Awin: cupons | Promotions API `type=voucher`, `regionCodes BR` | V | Código nulo sem parceria |
| Awin: comissões | Transactions API (até 31 dias por chamada, clickRef1..6) | V | |
| Awin: dados de produto | Create-a-Feed | VR | Campos variam por anunciante: fora desta entrega |
| **Cupons** Shopee, ML, Amazon por API | - | NC | Cadastro manual e CSV, marcados como tal |
| **Cliques** | Redirecionador próprio | Amazon e ML proibido · Shopee não confirmado · Awin depende do anunciante | Fora desta entrega; cliques só de relatório oficial importado, senão "não disponível" |
| Fila e agendamento | Postgres (`for update skip locked`) + laço do worker | V | |

## 3. Arquitetura

```
 Navegador ──> ERP na Vercel (telas, server actions, prévia, teste de credencial, importação, relatório)
                  │ sessão (RLS); segredos só pelo módulo server-only de credenciais
                  v
            Supabase Postgres  <── barramento: ofe_comandos, ofe_envios, ofe_numeros_estado, ofe_qr
                  ^
                  │ papel Postgres ofe_worker via pooler (grants só em ofe_* e nas RPCs do módulo)
 Worker Fly.io gru (Node 22, Baileys em versão exata) ── WebSocket ──> WhatsApp
                  └── HTTPS ──> Shopee / Awin (adaptadores compartilhados com o ERP)
```

- **O ERP não fala com o WhatsApp.** Pede ao worker por linhas em `ofe_comandos` (conectar por QR ou código de pareamento, desconectar, remover, sincronizar grupos, enviar teste) e lê `ofe_numeros_estado`, `ofe_qr`, `ofe_worker_estado`. Sem webhook, worker sem porta de entrada.
- **Worker (`erp/worker/`, `package.json` e `tsconfig` próprios, fora do tsconfig e do eslint da raiz):** uma sessão por número com automação aceita; estado de autenticação cifrado em `ofe_sessoes`; laços de comandos (2 s), preparação e despacho (5 s), sincronização de grupos (6 h e sob demanda), ingestão de eventos de participantes e de mensagens de grupos de origem, copiador, batimento (30 s). Fly com uma máquina, `kill_timeout = 30`, libera a trava da sessão no SIGTERM e não abre sessão cuja `trava_ate` pertence a outro. `npm ci --ignore-scripts`.
- **Acesso do worker ao banco:** papel `ofe_worker` (criado na migração sem senha; senha definida à parte com `ferramentas/sql.mjs`, nunca versionada) conectado pelo pooler com `pg`. Sem service role: se a biblioteca for comprometida, o financeiro fica fora de alcance. Sessões do worker marcam origem `worker` (extensão de `app.origem_atual()` com teste de integração, área crítica).
- **Porta `ConectorWhatsApp`** (tipos em `src/dominio/ofertas/conector.ts`): conectar, parear, desconectar, listarGrupos, metadadosGrupo, enviarImagem, enviarTexto, eventos. Implementações: Baileys (worker) e falsa (testes). Trocar por provedor depois é um arquivo.
- **Código compartilhado:** o worker importa `src/dominio/ofertas` e `src/integracoes` pelo alias `@/`, empacotado com esbuild; `server-only` vira stub no bundle (mesmo truque de `vitest.integracao.config.ts`).
- **Camada nova `src/integracoes/`** (adaptadores HTTP de afiliado) e `src/integracoes/credenciais.ts` (único lugar que lê segredo, com `clienteAdmin`): registrar em `docs/arquitetura.md` com decisão na base.
- **`src/integracoes/http.ts`:** só https, lista de hosts por plataforma, redirecionamento manual com no máximo 3 saltos e cada salto revalidado, bloqueio de IP privado após DNS, tempo limite 8 s, corpo limitado, sem cookie. Só resolve link curto (`s.shopee.com.br`, `shope.ee`, `amzn.to`, `a.co`, `mercadolivre.com/sec`) e baixa imagem de CDN permitido (Storage do projeto, CDN da Shopee). Dado de produto vem só de API.
- **Cifra (`src/lib/cripto.ts`):** AES-256-GCM com `node:crypto`, formato `{v, iv, tag, dados}` com versão de chave; `OFERTAS_CHAVE_CRIPTO` (32 bytes base64) na Vercel e na Fly. Escolhida no lugar do Vault porque ERP e worker decifram e o dump semanal continua restaurável com a chave guardada.

### Fila, estados e idempotência

- **Publicação** (`ofe_publicacoes`): uma intenção de post (oferta ou cupom, remetente número ou manual, agendamento, origem fila/copiador/avulsa, `texto_editado` por post). **Envio** (`ofe_envios`): publicação x grupo, com `numero_id` copiado e **`unique (publicacao_id, grupo_id)`**.
- **Estados gravados no envio:** `aguardando`, `processando`, `enviado`, `incerto`, `falhou`, `cancelado`, `ignorado`; mais `modo` (`manual`, `automatico`). "Programado" é derivado (`aguardando` com `agendado_para` futuro) por função em `dominio/ofertas/status.ts`. **Status da publicação é derivado** dos envios numa visão `security_invoker` (`rascunho`, `aguardando`, `programado`, `processando`, `enviado`, `parcial`, `ignorado`, `cancelado`, `falhou`, `incerto`), nunca gravado.
- **Preparação antes da reserva:** o worker prepara envios que vencem nos próximos minutos (atualiza dado do produto se a fonte permitir, gera link por grupo, renderiza texto, gera URL assinada da imagem). Envio sem link de afiliado válido não fica preparado e vira `falhou` com motivo: **nunca sai link sem afiliação**.
- **`public.ofe_reservar_envios(p_worker, p_limite)`** (`security invoker`, só `ofe_worker`): primeiro recupera reservas vencidas (sem `despacho_iniciado_em` volta a `aguardando`; com ele vira `incerto`); depois `for update skip locked` em envios `automatico` preparados com número conectado e automação aceita, fila ativa, `agendado_para <= now()`, dentro da janela, intervalo da fila cumprido, limites por hora e por dia do número (contando `incerto`), cupom vigente por `app.ofe_cupom_vigente()`. Índice único `(numero_id) where status = 'processando'` garante um envio por vez por número.
- **Despacho:** grava `despacho_iniciado_em` (commit) imediatamente antes de mandar pelo socket; a imagem é baixada por `http.ts` e entregue como Buffer (sem a Baileys buscar URL sozinha).
- **`public.ofe_concluir_envio(...)`:** `enviado` com id da mensagem; erro antes do despacho volta a `aguardando` com espera de 1, 5 e 15 min e no máximo 3 tentativas, depois `falhou` + alerta; resultado desconhecido vira `incerto`, nunca reenviado sozinho. Aba "Falhas e incertos" na fila com tentar de novo (pede conferir o grupo antes) e descartar, em lote. Reconciliação pelo eco da mensagem com id determinístico se o spike confirmar o recurso.
- **Modo manual:** `ofe_marcar_publicado(envio)` faz `update ... where status = 'aguardando'` e confere a contagem; envio manual não publicado em X horas (configurável) vira `ignorado` com motivo `nao_publicado_a_tempo`. Cupom vencido bloqueia nos dois modos.
- **Número desconectado:** nada é reservado, envios esperam, alerta abre.
- **Rodadas:** `ofe_filas.rodada` inteiro; publicações da rodada criadas na hora por `ofe_enfileirar_fila`, então pausar, reordenar e editar só afetam o que ainda não foi criado. Nova rodada só depois do fim da anterior e no máximo uma por dia (data de São Paulo), quando o reinício diário estiver ligado.
- **Fuso:** janela comparada com `(now() at time zone 'America/Sao_Paulo')::time`, janela que atravessa a meia-noite é recusada; datas do formulário convertidas com `TZDate` no servidor (roda em UTC); cron em UTC.
- **Cadência:** intervalo da fila e limites por número, com padrões conservadores e texto na tela dizendo que não garante proteção contra bloqueio. Sem rotação de número, sem intervalo "anti-detecção".
- **pg_cron:** `ofe-alertas` a cada 5 min (`public.ofe_gerar_alertas()`, `security definer` com checagem de `auth.uid()` como `gerar_alertas`, resolve só `tipo like 'ofe\_%'`, detecta worker parado pelo batimento) e `ofe-rotina-diaria` (expira cupom, abre rodada, limpa `cron.job_run_details`). Cada tabela com retenção traz seu próprio job na migração em que nasce. `gerar_alertas` existente não é tocado.
- **Modo assistido (sempre disponível):** tela Publicar lista o que está devido; cada item tem texto pronto, imagem, "Copiar texto" (primeiro passo, porque o WhatsApp no iOS descarta o texto ao compartilhar arquivo), "Compartilhar" (Web Share API no celular), "Abrir WhatsApp" no desktop e "Marcar como publicado".

### Decisões por plataforma

- **Shopee:** `generateShortLink` com subIds `[grupo, campanha, oferta]`, um link por oferta x grupo em `ofe_links`. Sem credencial: link colado, marcado "colado, não verificado pelo sistema". Dados por `productOfferV2`.
- **Mercado Livre:** sempre link do portal colado (uma etiqueta por canal ou campanha; link por grupo opcional). Dados manuais. No copiador, link do ML de terceiro vai para revisão manual.
- **Amazon:** `amazon.com.br/dp/{ASIN}?tag={id}`, ID de rastreamento por grupo opcional. Dados manuais. Modelo Amazon exige `{{atualizado_em}}` e o aviso de preço; imagem da Amazon não vai para o Storage. Cliente da Creators API só quando houver acesso (fora desta entrega).
- **Awin:** anunciante pelo domínio (cache de `programmedetails`, `validDomains`), link pelo Link Builder com `clickref = grupo`, `clickref2 = oferta`, curto tidd.ly oficial; cupons pela Promotions API; comissões pela Transactions API.
- **Trava de conformidade por plataforma:** "Canal WhatsApp cadastrado/confirmado no programa" (data, quem, observação). Fechada = a plataforma só gera rascunho. Amazon nasce fechada com o texto da cláusula na tela.

## 4. Telas e navegação

Área nova `ofertas` em `AREAS`, incluída explicitamente na `ESCRITA` do operador (leitura só lê); `papeis.test.ts` atualizado. Ações só do dono usam a área `usuarios` (`exigirEscrita("usuarios")`), com `areaDaRota` tratando `/ofertas/integracoes` como `usuarios`: credenciais, conectar e remover número, aceite de risco, trava de conformidade, autorização de grupo de origem. Grupo "Grupos de Ofertas" em `componentes/painel/navegacao.ts` (itens com `fase`), rótulos em `ROTULOS_SEGMENTO`, ícones em `Icone.tsx`, tipos de alerta em `TIPO_ALERTA_ROTULO` e `rotaDaEntidade`.

| Rota | Tela | Ações principais |
|---|---|---|
| `/ofertas` | Painel | Cards com destino filtrado: números `?status=`, grupos `?funcao=`, publicações `/ofertas/filas?status=`, automações `/ofertas/copiador?status=`, cupons ativos e `?vence=7d`, conversões importadas (origem e data), alertas `/alertas?tipo=ofe_*`, worker parado |
| `/ofertas/gerar` | Gerar oferta | Colar URL, identificar plataforma, validar, buscar dados (se houver API), converter link, prévia editável, trocar imagem, salvar rascunho, publicar agora (manual ou número), adicionar à fila |
| `/ofertas/publicar` | Publicar (assistido) | Copiar, compartilhar, abrir WhatsApp, marcar publicado, pular |
| `/ofertas/filas`, `/[id]` | Filas | Criar, destinos, remetente, modelo, cadência, janela, reinício diário, colar links, importar CSV Shopee com prévia, reordenar, editar, excluir, pausar, retomar, prévia do lote (N ofertas x M grupos = K mensagens, período estimado), status por item, aba Falhas e incertos |
| `/ofertas/copiador`, `/[id]` | Copiador | Origem autorizada, destinos, remetente, plataformas, filtros, limpeza, modelo, revisão manual (ligada por padrão), prévia com mensagens recentes, ativar, pausar, retomar, encerrar, itens com motivo |
| `/ofertas/cupons` | Cupons | Cadastrar, importar CSV, sincronizar Awin, pausar, editar, marcar expirado, enviar cupom, vincular a oferta |
| `/ofertas/modelos` | Modelos | Editor com variáveis documentadas, prévia, validação, padrão por plataforma e tipo |
| `/ofertas/grupos`, `/[id]` | Grupos | Cadastro manual ou sincronizado, vincular manual ao sincronizado, função, autorização da origem, filtros por número e período, comparação, métricas, eventos, estado da coleta |
| `/ofertas/numeros` | Números | Adicionar, aceite de risco, QR ou código de pareamento, status, última atividade e sincronização, erro, reconectar, desconectar, remover, limites, envio de teste para grupo de teste, eventos |
| `/ofertas/integracoes` | Integrações de afiliados (dono) | Por plataforma: métodos suportados e links oficiais, identificadores públicos e segredos separados, salvar, testar conexão, testar conversão, status, último erro, aprovações necessárias, trava de conformidade |
| `/ofertas/relatorios` | Relatórios | Filtros data, grupo, plataforma, campanha, oferta, fila, número; envios do sistema, cliques do marketplace e conversões em colunas separadas; importar relatório; exportar CSV (rota fora de `/api`) |
| `/ofertas/historico` | Histórico | Envios, tentativas e auditoria das tabelas `ofe_` (quem, quando, origem, destino, número, URLs, modelo, resultado, motivo) |

Estados em todas: carregando, vazio, erro, desconectado, indisponível ("não disponível pela integração"), "Sem dados" para nulo. Exclusões com `BotaoAcao`. Responsivo nas três larguras de `ferramentas/capturas.mjs`.

**Métricas de grupo (em `dominio/ofertas/evasao.ts` e `docs/regras-de-negocio.md`):**
- membros no início = última medição até o início do período; sem medição = "Sem dados" e a tela mostra a data de início da coleta
- saldo = entradas - saídas observadas no período
- variação líquida = membros no fim - membros no início (difere do saldo quando há lacuna)
- taxa de evasão = saídas no período ÷ membros no início × 100; nula sem medição inicial, "não calculável" com início zero, marcada "parcial" se o período cruza uma lacuna de coleta
- visualizações: sempre "não disponível pela integração"; cliques: só de relatório importado por subId/clickref

## 5. Dados

Todas com RLS. `app.auditar()` **só** em cadastro: integrações (sem o segredo), modelos, números (sem estado), grupos, filas, automações, cupons. **Nunca** em segredos, sessões, QR, comandos, estado de número, estado do worker, envios, tentativas, medições, eventos de grupo, mensagens de origem. URLs e texto de origem: select só com `app.pode_escrever()`; papel leitura vê agregados por visão.

| Migração (fase) | Tabelas e funções |
|---|---|
| **0021 (F11)** | `ofe_integracoes` (plataforma única; status nao_configurada, aguardando_autorizacao, conectada, erro, credencial_expirada, indisponivel; identificadores públicos; recursos; testado_em; ultimo_erro; trava de conformidade), `ofe_integracoes_segredos` (só via RPC `definer` de gravação com `app.eh_dono()` e leitura pelo módulo de credenciais), `ofe_modelos`, `ofe_gerar_alertas` v1, cron `ofe-alertas`, papel `ofe_worker` |
| **0022 (F12)** | `ofe_awin_anunciantes` |
| **0023 (F13)** | `ofe_grupos` (`numero_id` e `jid` nulos para cadastro manual; `cadastro` manual ou sincronizado; `unique (jid) where jid is not null`; função origem, destino, monitorado, teste, nenhuma; autorização; membros), `ofe_cupons` manual (`unique nulls not distinct (plataforma, codigo, fim_em)`), `app.ofe_cupom_vigente()`, `ofe_ofertas`, `ofe_links` (`unique nulls not distinct (oferta_id, grupo_id)`), `ofe_publicacoes`, `ofe_envios`, visão de status, `ofe_marcar_publicado`, bucket privado `ofertas-imagens` (insert em `storage.buckets` com tamanho e MIME, policies como 0005, assinador em `acoes/upload.ts`) |
| **0024 (F14)** | `ofe_numeros`, `ofe_numeros_estado` (status, worker_id, trava_ate, última atividade), `ofe_sessoes`, `ofe_qr`, `ofe_comandos`, `ofe_numeros_eventos`, `ofe_worker_estado`, `ofe_grupos_numeros` (quem participa), `numero_coletor_id` em `ofe_grupos` (só ele gera eventos, sem contagem dupla), `ofe_grupos_medicoes`, `ofe_grupos_eventos` (sem telefone), `ofe_coleta_lacunas`; `alter table` de `ofe_publicacoes` e `ofe_envios` com `numero_id` |
| **0025 (F15)** | `ofe_filas`, `ofe_filas_destinos`, `ofe_filas_itens`, `ofe_envios_tentativas` (retenção 180 dias); `alter table ofe_publicacoes` com `fila_item_id`, `rodada` e `unique`; `ofe_reservar_envios`, `ofe_concluir_envio`, `ofe_enfileirar_fila`; cron `ofe-rotina-diaria` |
| **0026 (F16)** | `ofe_automacoes`, `ofe_automacoes_destinos`, `ofe_mensagens_origem` (`unique (jid, wa_mensagem_id)`, texto apagado em 30 dias), `ofe_enfileirar_mensagem` com `pg_advisory_xact_lock` por automação e janela de duplicidade (padrão 24 h) |
| **0027 (F17)** | Sincronização Awin de cupons; `create or replace` de `ofe_reservar_envios` e `ofe_gerar_alertas` (cupom vencendo) |
| **0028 (F18)** | `ofe_importacoes` (hash único do arquivo), `ofe_conversoes` (`unique (plataforma, ref_externa)`), `ofe_cliques_importados`, visões de relatório `security_invoker` |

Regras do `erp/CLAUDE.md` que o desenho toca: RPC só do worker com `revoke ... from public, anon, authenticated` e `grant ... to ofe_worker`; `where` em todo update e delete (`safeupdate`); `grant usage, select` em sequência do schema `app`; `array_append` em plpgsql; nunca editar migração aplicada; `npm run tipos` após cada uma.

## 6. Segurança, LGPD e retenção

- Segredo nunca sai do servidor: a tela mostra só "configurado em dd/mm"; atualizar substitui sem revelar.
- Log estruturado com `contemSegredo` e `redigir(texto, valoresConhecidos)` (os segredos da Shopee e da Awin não têm padrão reconhecível); nunca registrar QR, código de pareamento, estado de sessão, token, cookie ou corpo com credencial. Logger da Baileys silenciado.
- zod no servidor em toda action; URL só pelo validador de `http.ts`; prévia renderizada como texto (sem `dangerouslySetInnerHTML`); checagem de origem das server actions do Next.
- Limites internos por integração (Awin 20/min, Shopee 1/s configurável) no worker e com `Limitador` nas actions.
- LGPD: sem telefone de participante (só contagens); texto de origem apagado em 30 dias (ficam hash e metadados); tentativas em 180 dias; envios e conversões em 24 meses; finalidade e retenção em `docs/regras-de-negocio.md`; aceite de risco por número e autorização por grupo de origem registrados.
- Worker sem porta de entrada, papel de banco restrito, segredos na Fly (`OFERTAS_WORKER_DB_URL`, `OFERTAS_CHAVE_CRIPTO`, `OFERTAS_WORKER_ID`). Nenhum `NEXT_PUBLIC_` novo.
- Copiador: só grupo origem com autorização registrada; allowlist e blocklist de domínios; remove menção, convite (`chat.whatsapp.com`, `t.me`), CTA e link de terceiro por regra, sem apagar linha com preço, validade, condição ou vendedor; imagem da origem não é reutilizada por padrão.

## 7. Fases

Numeração continua a do ERP (`FASE_ATUAL = 10`). Cada fase: plano no formato de `erp/docs/superpowers/plans/`, migração em dev e teste + `npm run tipos`, testes, docs, seção nova no guia, `FASE_ATUAL`, commit. Complexidade: P, M, G.

**Passo 0:** gravar a spec em `erp/docs/superpowers/specs/2026-10-18-grupos-de-ofertas-design.md` com esta pesquisa; limpar a sobra de `parametros_custo` v44 no projeto de teste (integração verde como base); registrar decisões (camada `integracoes`, papel `ofe_worker`, cifra, sem redirecionador) com `/kb-decisao` quando o MCP voltar.

| Fase | Entrega | Principais arquivos | Depende de | Aceite |
|---|---|---|---|---|
| **11 Fundação** (M) | Área, navegação, painel com estados honestos, cifra, HTTP seguro, alertas do módulo, papel do worker | `lib/auth/papeis.ts`, `componentes/painel/navegacao.ts`, `lib/cripto.ts`, `lib/env.ts`, `integracoes/http.ts`, `app/(painel)/ofertas/page.tsx`, `dados/alertas.ts`, `docs/arquitetura.md`, `docs/variaveis-de-ambiente.md` | `OFERTAS_CHAVE_CRIPTO` | Painel sem dado fictício; papéis testados; cifra com teste de adulteração; SSRF recusado nos testes |
| **12 Integrações** (M) | Tela Integrações de afiliados; adaptadores Shopee, Awin, Amazon (tag), ML manual; testar conexão e conversão; trava de conformidade; início de `erp/docs/GUIA_CONFIGURACAO_INTEGRACOES.md` | `integracoes/{shopee,awin,amazon,mercado-livre,credenciais}.ts`, `acoes/ofertas/integracoes.ts`, `dados/ofertas/integracoes.ts`, `app/(painel)/ofertas/integracoes/` | Credenciais Shopee e Awin para o teste real | "Conectada" só após chamada real; segredo nunca volta; assinatura Shopee com vetor fixo |
| **13 Oferta, modelos, cupons manuais e modo assistido** (M) | Gerar oferta, modelos, imagem por upload, grupos manuais, cupons manuais vinculados, Publicar | `dominio/ofertas/{plataformas,urls,links-afiliado,modelos,limpeza,status,cupons}.ts`, `app/(painel)/ofertas/{gerar,modelos,publicar,grupos,cupons}/` | Fase 12 | Operação completa à mão sem WhatsApp conectado; "não informado" em campo sem fonte; alerta de dado desatualizado; cupom vencido bloqueado |
| **14 WhatsApp, números e grupos** (G) | Spike de 1 dia (go/no-go: QR e pareamento, grupos, imagem + legenda, eventos, id determinístico, Web Share no iOS) com número e grupo de teste; worker na Fly; status; sincronização; medições; entradas e saídas; lacunas; envio de teste | `erp/worker/{index,sessoes,estado-auth,comandos,ingestao}.ts`, `Dockerfile`, `fly.toml`, `app/(painel)/ofertas/numeros/`, `dominio/ofertas/evasao.ts` | Conta Fly, número dedicado, grupo de teste | Tela reflete a sessão real; desconexão abre alerta; nada de QR ou sessão em log; evasão com nulos e lacunas |
| **15 Fila e despacho** (G) | Filas, CSV Shopee, cadência, rodadas, preparação, reserva, conclusão, retentativa, incerto, Falhas e incertos | `dominio/ofertas/{cadencia,csv-shopee}.ts`, `erp/worker/{preparo,despacho}.ts`, `app/(painel)/ofertas/filas/` | Fase 14 (fila manual funciona sem ela) | Duas reservas paralelas nunca pegam o mesmo envio; retentativa não duplica; agenda, janela e limites respeitados |
| **16 Copiador** (G) | Automações, ingestão, filtros, limpeza, conversão, duplicidade, revisão, prévia | `dominio/ofertas/{copiador,deduplicacao}.ts`, `erp/worker/copiador.ts`, `app/(painel)/ofertas/copiador/` | Fases 14 e 15 | Link não convertível vai para revisão; link da origem nunca sai; informação essencial preservada |
| **17 Cupons automáticos** (P) | Sincronização Awin, envio automático só de cupom com fonte oficial, alerta de vencimento | `integracoes/awin.ts`, `erp/worker/cupons.ts` | Awin | Validade visível; "validade não confirmada" no manual sem data |
| **18 Relatórios** (M) | Por grupo, plataforma, oferta, fila e período; Shopee e Awin por API; CSV de ML, Amazon e Shopee; exportação; Histórico | `dominio/ofertas/{relatorios,conversoes-csv}.ts`, `app/(painel)/ofertas/{relatorios,historico}/` | Amostras reais dos relatórios | Envio, clique e conversão separados; origem e data de cada número |
| **19 Endurecimento e guia** (M) | `/auditoria-seguranca`, capturas nos dois temas, critérios em `docs/validacao.md`, guia final só com o que existe | docs | Tudo acima | Guia confere com as telas; nenhuma credencial no arquivo |

Ordem: 0, 11, 12, 13 (já usável à mão), 14, 15, 16, 17, 18, 19.

## 8. Testes

- **Unitários (vitest, ao lado do domínio; `worker/**/*.test.ts` incluído):** plataforma e URL (matriz por domínio, link curto, `shopee.com.br.evil.com`); preservação de parâmetros de atribuição; link Amazon; assinatura Shopee; modelos (variável ausente, desconhecida, seção condicional); limpeza preservando preço, validade e condição; duplicidade; cadência, janela e fuso; evasão (início zero, sem medição, lacuna); vigência e compatibilidade de cupom; CSV; cifra (ida e volta, adulteração, versão); SSRF (IP privado, salto para host fora da lista); estado derivado.
- **Integração (`fcs-os-teste`):** RLS de cada tabela `ofe_` por papel (segredo e sessão invisíveis pela sessão, QR só dono, URLs só com escrita); segredo salvo nunca volta pela camada `dados`; `ofe_reservar_envios` em paralelo; reserva vencida sem e com despacho iniciado; retentativa e limite de tentativas; número desconectado; cupom vencido nos dois modos; limites por hora; enfileirar duas vezes; rodada única por dia; `ofe_marcar_publicado` concorrente; auditoria sem linhas sensíveis; papel `ofe_worker` sem acesso fora de `ofe_*`; alertas idempotentes.
- **Worker (vitest com conector falso):** comandos, preparo, despacho, pausa por desconexão, SIGTERM liberando a trava, ingestão, copiador de ponta a ponta.
- **E2E (banco dev = produção):** só leitura e modo manual com dados sintéticos e limpeza; nunca salva credencial nem cria envio automático. Navegação, Gerar oferta manual até rascunho, Publicar assistido, fila manual criar e pausar, grupo com "não disponível" em visualizações, cupom vencido bloqueado.
- **Regressão:** `npm run lint && npm run typecheck && npm test && npm run build`, integração completa e os 25 e2e existentes a cada fase.

## 9. Credenciais e aprovações externas

| Item | Onde | Para quê | Sem isso |
|---|---|---|---|
| Shopee AppID + Secret | affiliate.shopee.com.br > Open API (aprovação) | Link com subId, dados, conversões | Link colado e dado manual |
| Shopee: grupos como "Mídia de Afiliado" | Portal Shopee | Termos 1.3 | Trava fechada |
| Awin publisher ID + token | ui.awin.com/awin-api ("Show my API token") + parcerias | Links, cupons, comissões | Awin fora |
| Amazon tag e IDs de rastreamento | Associates Central | Link | Amazon fora |
| Amazon: confirmação de uso em grupos | Suporte de Associados | Abrir a trava | Só rascunho |
| Amazon Creators API | Associates Central > Ferramentas (10 vendas em 30 dias) | Preço e imagem oficiais | Dado manual (cliente fica para depois) |
| Mercado Livre: etiquetas e canais cadastrados | Portal de Afiliados | Termos 1.3 | Trava fechada |
| Números dedicados + grupo de teste | Chip próprio | Worker | Só modo assistido |
| Conta Fly.io com cartão | fly.io | Worker (cerca de US$ 5/mês) | Só modo assistido |
| `OFERTAS_CHAVE_CRIPTO` | Gerada localmente; Vercel, Fly e cópia no cofre do dono | Credenciais e sessões | Integrações não salvam |
| Senha do papel `ofe_worker` | Definida com `ferramentas/sql.mjs`, guardada na Fly | Acesso do worker | Worker não sobe |
| Vercel Pro | Já pendente no ERP | Uso comercial | Risco contratual existente |

## 10. Riscos e decisões

| Risco | Recomendação |
|---|---|
| Banimento do número (risco aceito) | Números dedicados, limites baixos, desligar por número em um clique, modo assistido como reserva; a tela não promete imunidade |
| Baileys quebrar ou ser comprometida | Versão exata, `--ignore-scripts`, papel de banco restrito, spike antes, alerta de worker parado |
| Amazon em grupo de WhatsApp | Trava fechada até o suporte confirmar; página-ponte no site fica fora |
| Mercado Livre sem API | Link sempre do portal, uma etiqueta por canal |
| Shopee Open API não aprovada | Pedir já; fluxo manual funciona enquanto isso |
| Clique próprio proibido ou não confirmado | SubIds oficiais e relatórios importados; redirecionador só se Shopee ou anunciante Awin confirmarem por escrito, em entrega futura |
| Vercel Hobby e Supabase Free | Worker não depende do cron da Vercel e mantém o banco ativo; Pro e backup seguem pendentes no ERP |
| e2e no banco de produção | Só leitura e modo manual, dados sintéticos, worker nunca envolvido |
| Shopee: tráfego pago só em redes sociais da conta cadastrada | Registrar no guia; regra de negócio |

## Verificação

1. A cada fase em `erp/`: `npm run lint && npm run typecheck && npm test && npm run build`; `npm run test:integracao` (banco); `npm run e2e` (tela); `node ferramentas/capturas.mjs`.
2. Fase 12: conexão real com Shopee e Awin; abrir o link gerado e conferir subId e clickref.
3. Fases 14 e 15: número de teste por QR, envio ao grupo de teste; derrubar a sessão no celular e ver a fila parar e o alerta abrir; matar o worker no meio de um envio e ver o item ir para `incerto`; `fly deploy` durante um envio e ver a trava liberada.
4. Fase 16: copiador numa origem de teste autorizada com links Shopee, Amazon e ML; conferir conversão, revisão do ML e duplicidade.
5. Fase 19: `/auditoria-seguranca` sem achado alto aberto; guia conferido tela a tela.

## Fontes consultadas (18/10/2026)

- WhatsApp Groups API: developers.facebook.com/documentation/business-messaging/whatsapp/groups/ (/reference, /webhooks, /pricing); OBA: .../whatsapp/official-business-accounts; coexistência: .../embedded-signup/onboarding-business-app-users
- Política: whatsappbusiness.com/pt-br/policy/ · Termos: whatsapp.com/legal/terms-of-service?lang=pt_BR · Diretrizes: whatsapp.com/legal/messaging-guidelines
- Baileys: github.com/WhiskeySockets/Baileys · Fly.io: docs.fly.io/about/pricing · Vercel: vercel.com/docs/cron-jobs/usage-and-pricing, vercel.com/docs/functions/limitations · Supabase: supabase.com/docs/guides/cron, /queues, /platform/free-project-pausing
- Shopee: help.shopee.com.br artigos 128461, 127542, 124094 (Termos de 09/09/2026); affiliate.shopee.com.br/open_api (exige login, não lida)
- Mercado Livre: mercadolivre.com.br/ajuda/30228 (termos), 32751, 30084, 27916, 35616
- Amazon: affiliate-program.amazon.com/creatorsapi/docs (deprecação PA-API, onboarding, OffersV2, api-rates); associados.amazon.com.br/help/operating/policies
- Awin: help.awin.com/apidocs (authentication, generatelink, generatebatchlinks, quota, promotions, transactions, programmedetails); Code of Conduct do publisher
