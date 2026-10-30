# Arquitetura

Next.js 16 (App Router) em `erp/`, Supabase (Postgres 17, Auth, Storage) como banco único da empresa, projeto `fcs-os` (dev e produção, até a Fase 10) e `fcs-os-teste` (testes de integração).

## Camadas

```
app/            rotas e layouts: só composição
componentes/    ui (shadcn), painel (shell e peças genéricas), <modulo>
acoes/          server actions: exigirEscrita -> zod -> dominio -> dados -> revalidatePath
dados/          consultas e escritas (server-only, cliente com sessão)
dominio/        regras puras e testadas (sem React, Next ou Supabase)
lib/            env, supabase (servidor, admin, proxy), auth (papeis, sessao), forms, formatos, tema, cripto
integracoes/    adaptadores HTTP de afiliado (Grupos de Ofertas): http seguro, Shopee, Awin, conversor, segredo, credenciais
worker/         (fora de src) processo do WhatsApp na Fly.io; fala com o ERP só pelo banco
```

Dependência permitida: `app -> componentes -> acoes -> dominio, dados`. Exceção única: `acoes/publico/` e `dados/publico/` servem as páginas públicas `/sorteio` (QR do panfleto) e `/portfolio` (catálogo sob demanda) sem sessão; a escrita passa por limite por IP, campo armadilha, zod e `rpc` pela service role a `inscrever_sorteio`, executável só por `service_role` e com limite por IP no banco; a leitura é só id e nome de produtos ativos (sorteio) e nome, slug e foto de categorias e itens ativos do catálogo (`dados/publico/catalogo.ts`, sem escrita). Nada mais entra nessas pastas sem decisão registrada. `dominio` não importa nada das outras camadas (lint bloqueia). Um arquivo `"use server"` só exporta funções assíncronas; constantes compartilhadas (tipos de canal, rótulos) vivem em `dominio/`.

## Sessão e permissão

- `src/proxy.ts` renova o cookie e manda deslogado para `/login`. Não decide permissão. Rotas livres: `/login`, `/sem-acesso`, `/sorteio` e `/portfolio` (páginas públicas).
- Páginas chamam `exigirLeitura(area)`; actions chamam `exigirEscrita(area)`. Mapa em `lib/auth/papeis.ts`.
- O banco repete a regra com RLS (`app.papel_atual()`): a aplicação usa o cliente com a sessão do usuário, então uma falha de permissão na aplicação não vaza dado.
- Service role só em `lib/supabase/admin.ts` (criar usuário, listar e-mails), em `ferramentas/` e na exceção pública acima (`acoes/publico`, `dados/publico`).

## Grupos de Ofertas

- `src/integracoes/` é a única camada que faz HTTP para fora. Tudo passa por `integracoes/http.ts`: só https, lista de hosts por plataforma, IP privado bloqueado depois do DNS, redirecionamento seguido à mão com cada salto revalidado, tempo limite e corpo limitado. Fica aceita a janela entre o DNS da checagem e o do fetch (rebinding), porque só hosts de marketplaces conhecidos passam pela lista.
- Segredos de afiliado: cifrados com AES-256-GCM (`lib/cripto.ts`, chave `OFERTAS_CHAVE_CRIPTO`) e gravados por `ofe_salvar_segredo` (só dono) em `ofe_integracoes_segredos`, tabela sem policy nem grant para `authenticated`. Só `integracoes/credenciais.ts` lê e decifra (service role), e o resultado vive só na memória da chamada.
- O ERP não fala com o WhatsApp. O worker (`erp/worker/`, Fly.io) conecta com o papel Postgres `ofe_worker`, que só tem grant nas tabelas `ofe_*` e nas RPCs do módulo, e conversa com o ERP por `ofe_comandos`, `ofe_envios` e tabelas de estado. O worker não tem porta de entrada.
- Nenhum redirecionador próprio de clique: Amazon e Mercado Livre proíbem; a atribuição usa sub ID (Shopee), clickref (Awin) e ID de rastreamento (Amazon).

## Origem e auditoria

Todo cliente envia `x-origem` (`web`, `mcp`, `script`, `importacao`); conexões do papel `ofe_worker` valem `worker`. O trigger `app.auditar()` grava antes, depois, usuário e origem em `auditoria`. Pela API HTTP sem cabeçalho vale `web`; só SQL direto (Management API) vale `script`.

## Decisões (ADR curtas)

- 2026-10-11: app dentro do repositório `Fcs OS` em `erp/`, migrações na raiz (`supabase/migrations/`) aplicadas por `ferramentas/migrar.mjs` via Management API, porque não há Docker nem CLI logada na máquina e a regra do workspace já era essa.
- 2026-10-11: RLS real por papel em vez de service role com checagem só na aplicação, porque o endpoint MCP (Fase 2) também acessa o banco.
- 2026-10-11: shadcn/ui (estilo radix-nova) com tokens próprios em vez de componentes manuais, porque o ERP é denso em tabelas, diálogos e formulários.
- 2026-10-11: `cacheComponents` desligado no `next.config.ts`. Toda página lê sessão e banco a cada request; com Cache Components cada `cookies()` exigiria Suspense e a sessão não poderia ser lida no layout.
- 2026-10-11: banco de teste é um segundo projeto Supabase Free (`fcs-os-teste`), porque não há Docker para rodar o Supabase local.
- 2026-10-15: página pública `/sorteio` dentro do ERP (e não um site separado), porque o cadastro precisa cair em `clientes` sem rotina de importação, e o deploy, as fontes e os componentes já existem. A escrita sem sessão passa por uma função SQL que só a service role executa, em vez de policy para `anon`, para nenhuma tabela ficar aberta ao anônimo.
- 2026-10-18: módulo Grupos de Ofertas no ERP com WhatsApp em modo assistido (o usuário publica) e automação opcional por worker próprio com Baileys na Fly.io, ligada por número com aceite de risco. A API oficial (Groups API da Cloud API) aceita no máximo 8 participantes e não controla grupos já existentes; a conexão por QR viola os Termos do WhatsApp e o risco fica registrado na tela e na spec.
- 2026-10-18: cifra na aplicação (AES-256-GCM, chave em variável de ambiente) em vez do Supabase Vault, porque ERP e worker decifram e o dump semanal continua restaurável com a chave guardada.
- 2026-10-18: worker com papel Postgres próprio (`ofe_worker`) em vez da service role, para que um comprometimento da biblioteca do WhatsApp não alcance financeiro e clientes.
- 2026-10-29: catálogo público `/portfolio` dentro do ERP, no mesmo padrão do `/sorteio` (decisão do dono). O caminho não é `/catalogo` porque o painel já usa `/catalogo/produtos` e `/catalogo/precificacao`, e a rota livre do proxy casa por prefixo. Itens vêm das coleções do MakerWorld, coletados pelo Chrome logado e gravados por `ferramentas/importar-catalogo.mjs` (service role) em `catalogo_categorias` e `catalogo_itens`; fotos em webp 600x600 comprimido no bucket público `catalogo`, porque o Supabase está no plano gratuito (1 GB) e sem transformação de imagem. A página lê pela service role em `dados/publico/catalogo.ts`, só leitura, em vez de policy para `anon`. A licença de cada modelo fica anotada e não filtra: o dono assumiu o risco de modelos com licença que proíbe vender a peça impressa e de réplicas de arma.
