# Implantação na Vercel

Decisão D4 tomada em 12/10/2026: Vercel. O plano precisa ser o **Pro** (US$ 20 por assento/mês): o Hobby proíbe uso comercial nos termos de serviço, e o ERP é a operação de uma loja. O repositório já está pronto para a Vercel; o que falta é o que só o dono da conta faz.

## Situação em 12/10/2026

Publicado: **https://fcs-erp.vercel.app** (projeto `fcs-erp`, time Vusk's projects, Root Directory `erp`, Production Branch `main`, região `gru1`). Conferido depois do deploy: `/` redireciona para `/login`, cabeçalhos de segurança presentes, login com conta real entra no painel, MCP em produção responde com as 11 ferramentas. No Supabase, `site_url` e `uri_allow_list` já apontam para a URL de produção (e `localhost:3000` para o dev), feito pela Management API. `main` passou a ser a branch publicada: `erp-fase-1` foi levada a `main` por fast-forward.

Ainda falta (só o dono faz): plano Pro na Vercel (o time está no Hobby), domínio próprio, verificação em duas etapas no perfil, segredos e primeiro backup no GitHub.

## O que já está no repositório

- `erp/vercel.json`: framework Next.js e região `gru1` (São Paulo), a mesma do Supabase `fcs-os` (sa-east-1).
- `erp/package.json`: `engines.node >= 22` (a Vercel usa o Node 22 ou 24 que tiver disponível).
- `erp/next.config.ts`: cabeçalhos de segurança e corpo de server action limitado a 4 MB. A Vercel corta qualquer requisição acima de 4,5 MB, por isso os uploads de arquivos de produto (até 100 MB) e de anexos do conhecimento vão **direto do navegador para o Supabase Storage** por URL assinada; a action só recebe os metadados.
- `maxDuration = 60` nas rotas que podem demorar (importação de pedidos, conciliação de repasses, geração de recorrências, verificação de alertas, histórico de precificação e o servidor MCP).
- CI (`.github/workflows/ci.yml`) e backup (`.github/workflows/backup.yml`) independem da Vercel.

## Passo a passo

1. **Publicar o código:** `/salvar` na raiz do workspace. A branch publicada é `main`; `erp-fase-1` é a de trabalho e vai para `main` por fast-forward quando estiver verde.
2. **Criar o projeto na Vercel:** Add New > Project > importar `BernardoVusk/fcs-os`.
   - Root Directory: `erp` (clicar em Edit ao lado do diretório raiz).
   - Framework Preset: Next.js (detectado). Build `npm run build`, install `npm ci`, output padrão.
   - Production Branch: `main`.
3. **Variáveis de ambiente** (Settings > Environment Variables, marcar Production e Preview):
   - `SUPABASE_URL` = `https://jdjbyxysxtnyhztypeai.supabase.co`
   - `SUPABASE_ANON_KEY` = chave anon do projeto `fcs-os` (Supabase > Project Settings > API)
   - `SUPABASE_SERVICE_ROLE_KEY` = chave service role do mesmo projeto (só servidor; nunca `NEXT_PUBLIC_`)
   - `OFERTAS_CHAVE_CRIPTO` = a mesma chave do `erp/.env.local` (Grupos de Ofertas; sem ela as credenciais de afiliado não salvam nem abrem). Marcar como Sensitive.
   - Nada de `E2E_*` em produção.
4. **Deploy.** O primeiro build leva uns 2 minutos. A URL `*.vercel.app` já funciona.
5. **Supabase, depois do primeiro deploy:** Authentication > URL Configuration: `Site URL` = a URL de produção; adicionar a mesma em `Redirect URLs` (e a de preview `https://*-<time>.vercel.app` se for usar previews com login).
6. **Domínio:** Settings > Domains, por exemplo `erp.fcs3dstudio.com.br` (CNAME para `cname.vercel-dns.com`). HTTPS automático. Repetir o passo 5 com o domínio final.
7. **Primeiro acesso:** entrar com o usuário dono já existente no `fcs-os`. Em Perfil, ativar a verificação em duas etapas. Em Configurações > Integrações, criar um token do MCP e, no computador, definir `FCS_ERP_URL=https://<domínio>` e `FCS_ERP_MCP_TOKEN` como variáveis de usuário do Windows (o `.mcp.json` já lê as duas); testar com `node ferramentas/mcp-smoke.mjs`.
8. **Backup:** no GitHub, criar os segredos `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE` e `SUPABASE_TESTE_DB_URL` e rodar o workflow `backup` uma vez com `RESTAURAR` (detalhes em `docs/backups-e-recuperacao.md`).

## Migrações em produção

O banco de produção é o projeto `fcs-os` (o mesmo de desenvolvimento) e está na migração 0028 desde 18/10/2026. A cada migração nova: `npm run migrar -- --alvo dev` e `--alvo teste` antes de publicar o código que depende dela. A Vercel não roda migração.

## Limites da Vercel que importam aqui

| Limite | Valor (Pro) | Como o ERP lida |
|---|---|---|
| Corpo da requisição | 4,5 MB | upload direto ao Storage por URL assinada; CSV de pedidos e repasses fica bem abaixo |
| Duração da função | 15 s padrão, até 300 s | `maxDuration = 60` nas rotas pesadas |
| Região | uma por projeto | `gru1`, ao lado do banco |
| Cron | existe, mas não é usado | alertas diários rodam no pg_cron do banco |

## Checagem depois de publicar

- `/login` autentica; `/` mostra o painel com "Sem dados" onde ainda não há registro.
- Alertas > Verificar agora responde; `node ferramentas/sql.mjs "select jobname from cron.job"` mostra `alertas-diarios`.
- Catálogo > produto > Arquivos: enviar um STL de verdade (acima de 5 MB) e abrir pela URL assinada.
- Relatórios > XLSX abre no Excel com acento.
- CI verde no GitHub; backup rodado uma vez com restauração no projeto de teste.

## Worker do WhatsApp na Fly.io (Grupos de Ofertas)

O ERP funciona sem o worker: o modo assistido (tela Publicar) monta a postagem e você publica pelo celular. O worker só é preciso para conectar número, sincronizar grupos, medir membros, enviar sozinho pela fila e rodar o copiador. Ele roda fora da Vercel porque precisa de uma conexão aberta o tempo todo com o WhatsApp.

O que está no repositório: `erp/worker/` com `package.json` próprio (Baileys 7.0.0-rc14, `pg`, `qrcode`, versões exatas), `build.mjs` (esbuild junta o código compartilhado de `erp/src`), `Dockerfile` (Node 22, `npm ci --omit=dev --ignore-scripts`), `fly.toml` (app `fcs-ofertas-worker`, região `gru`, sem porta de entrada, `kill_timeout = 30`). Situação em 18/10/2026: **ainda não publicado**; o login do papel `ofe_worker` só foi ligado no projeto de teste.

Antes de começar: conta na Fly.io com cartão (uma máquina `shared-cpu-1x` de 512 MB), `flyctl` instalado e `fly auth login`; um número de celular dedicado ao WhatsApp das ofertas e um grupo de teste. Usar a Baileys viola os termos do WhatsApp e pode levar ao banimento do número: não use o seu número pessoal nem o da loja.

1. **Senha do papel do worker no banco de produção:** `cd erp && node ferramentas/papel-worker.mjs --alvo dev`. Gera senha nova, liga o login do `ofe_worker` e grava `OFERTAS_WORKER_DB_URL` no `.env` da raiz, sem mostrar a senha. Rodar de novo troca a senha (o worker em produção para até receber a nova).
2. **Pacote:** `cd erp && npm ci`, depois `cd worker && npm ci --ignore-scripts && npm run build` (gera `worker/dist/`, que o Dockerfile copia).
3. **App:** `fly apps create fcs-ofertas-worker`.
4. **Segredos**, lidos do `.env` da raiz sem passar pelo histórico do terminal:
   `grep -E '^(OFERTAS_WORKER_DB_URL|OFERTAS_CHAVE_CRIPTO|SUPABASE_URL)=' ../../.env | fly secrets import --app fcs-ofertas-worker`
   `OFERTAS_WORKER_ID` é opcional (padrão `fly-<hostname>`). Não colocar `SUPABASE_SERVICE_ROLE_KEY` na Fly: o worker não usa.
5. **Publicar:** dentro de `erp/worker`, `fly deploy --app fcs-ofertas-worker` e depois `fly scale count 1 --app fcs-ofertas-worker` (uma máquina só; a trava por número impede duas sessões iguais, mas duas máquinas só disputariam a trava).
6. **Conferir:** `fly logs --app fcs-ofertas-worker` mostra uma linha JSON com `"evento":"iniciando"`; no ERP, `/ofertas` passa a mostrar o worker em funcionamento.
7. **Primeiro número:** `/ofertas/numeros` (só dono): cadastrar, aceitar o termo de risco, conectar por QR ou código de pareamento, sincronizar os grupos e mandar o envio de teste para o grupo de teste.

Parar tudo: `fly scale count 0 --app fcs-ofertas-worker`. Os envios automáticos esperam, o alerta de worker parado abre em até 15 minutos (5 sem batimento mais o intervalo do job, se houver número já conectado alguma vez) e o modo assistido continua.

Atualizar: repetir os passos 2 e 5. O SIGTERM do deploy libera as travas dos números antes de a máquina sair.

Troca da chave de cifra: colocar a chave antiga em `OFERTAS_CHAVE_CRIPTO_ANTERIOR` e a nova em `OFERTAS_CHAVE_CRIPTO`, na Vercel e na Fly. As duas abrem; o que for salvo de novo sai com a nova. Não há ferramenta de recifragem em lote: salvar de novo as credenciais em `/ofertas/integracoes` e, se preciso, reconectar os números. Só depois tirar a anterior.

Recomendações da auditoria de 18/10/2026 (`saidas/seguranca/2026-10-18-auditoria.md`) para antes do primeiro deploy: fixar o digest da imagem `node:22-slim` no Dockerfile e ativar a verificação em duas etapas do dono.

## Deploy bloqueado ("Deployment was blocked")

No plano Hobby, a Vercel só publica commit cujo autor é a conta do GitHub ligada ao projeto (`BernardoVusk`). Commit com o e-mail `focusarq.equipe@gmail.com` aparece como bloqueado. Solução usada em 15/10 e 19/10/2026: um commit com o autor da conta, por cima do que se quer publicar.

```
GIT_COMMITTER_NAME="Bernardo Vusk" GIT_COMMITTER_EMAIL="89705221+BernardoVusk@users.noreply.github.com" \
  git commit --allow-empty --author="Bernardo Vusk <89705221+BernardoVusk@users.noreply.github.com>" -m "deploy: ..."
git push
```

Para não repetir: `git config user.email 89705221+BernardoVusk@users.noreply.github.com` na raiz do repositório.

## Previews

Cada push abre um deploy de preview na Vercel apontando para o **mesmo** banco de produção (as variáveis são as mesmas). Para testar sem mexer em dado real, use o ambiente local com `npm run dev`, ou crie um conjunto de variáveis só para Preview apontando para o projeto `fcs-os-teste`.
