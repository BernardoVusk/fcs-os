# Implantação

## Hospedagem (decisão D4)

O Next.js do ERP roda igual na Vercel e na Netlify; nenhum arquivo do repositório assume um host. O que muda é preço e licença:

| Opção | Custo | Uso comercial | Observação |
|---|---|---|---|
| Vercel Hobby | grátis | proibido pelos termos | não serve para o ERP |
| Vercel Pro | US$ 20/mês por membro | permitido | mesmo painel do site da FX, que o usuário já conhece |
| Netlify Starter | grátis (300 min de build, 100 GB) | permitido | runtime Next.js oficial da Netlify; um só membro |

Recomendação: começar na **Netlify Starter** (custo zero, licença ok) e migrar para Vercel Pro só se aparecer limitação. A decisão e a criação da conta são do usuário.

## Passos (qualquer host)

1. Conectar o repositório `BernardoVusk/fcs-os`, diretório raiz `erp`, comando de build `npm run build`, Node 24.
2. Variáveis de ambiente de produção (nomes em `docs/variaveis-de-ambiente.md`): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Nenhuma `NEXT_PUBLIC_*`.
3. Domínio: subdomínio da marca (por exemplo `erp.fcs3dstudio.com.br`) apontando para o host; HTTPS automático.
4. No Supabase: Authentication > URL Configuration, `Site URL` = a URL de produção e ela também em `Redirect URLs`.
5. Migrações: o banco de produção é o projeto `fcs-os` (dev). Antes do primeiro deploy, `npm run migrar -- --alvo dev` já aplicou tudo até a 0018; a cada migração nova, aplicar em dev e teste antes de publicar o código.
6. pg_cron: o job `alertas-diarios` (0018) roda no banco, independente do host.
7. MCP em produção: em Configurações > Integrações criar um token, e no computador do usuário definir `FCS_ERP_URL=https://<dominio>` e `FCS_ERP_MCP_TOKEN` (variáveis de usuário, nunca em arquivo versionado). O `.mcp.json` já usa essas variáveis.
8. Depois do primeiro deploy: criar o usuário dono com `node ferramentas/criar-usuario.mjs` apontando para produção, ativar a verificação em duas etapas em Perfil, e rodar o backup com restauração de teste (`docs/backups-e-recuperacao.md`).

## Supabase Free x Pro

Subir para Pro quando o financeiro real entrar (backup diário, sem pausa de 7 dias) ou quando o Storage passar de 700 MB. Até lá, o backup semanal do workflow cobre o banco.

## Checagem de saúde depois de publicar

- `/login` abre e autentica; `/` mostra o painel com "Sem dados" onde ainda não há registro, nunca número inventado.
- Configurações > Integrações: criar token e rodar `node ferramentas/mcp-smoke.mjs` do computador do usuário.
- Alertas > Verificar agora responde; `select * from cron.job` mostra o job.
- CI verde no GitHub (lint, tipos, unitários, build e checagem de segredo no bundle).
