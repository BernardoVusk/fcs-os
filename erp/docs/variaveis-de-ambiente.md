# Variáveis de ambiente

| Variável | Onde | Uso | Vai ao navegador? |
|---|---|---|---|
| `SUPABASE_URL` | `erp/.env.local`, host e worker (Fly) | URL do projeto; no worker, monta o endereço das imagens de oferta no Storage | não (só servidor) |
| `SUPABASE_ANON_KEY` | `erp/.env.local`, host | cliente com sessão (RLS vale) | não |
| `SUPABASE_SERVICE_ROLE_KEY` | `erp/.env.local`, host | criar usuário, listar e-mails | nunca |
| `E2E_EMAIL`, `E2E_SENHA` | `erp/.env.local` | testes e2e | não |
| `SUPABASE_ACCESS_TOKEN` | `.env` da raiz | Management API (migrações, projeto de teste) | nunca |
| `SUPABASE_PROJECT_REF` | `.env` da raiz | alvo dev | não |
| `SUPABASE_TESTE_*` | `.env` da raiz | projeto de teste (ref, url, chaves, senha do banco) | não |
| `SORTEIO_WHATSAPP_URL` | `erp/.env.local`, host | link de convite do grupo mostrado na página pública `/sorteio`; sem ela a página avisa que o link chega depois | sim, como link na página (não é segredo) |
| `OFERTAS_CHAVE_CRIPTO` | `erp/.env.local`, `.env` da raiz, host (Vercel) e worker (Fly) | chave AES-256 (32 bytes em base64) das credenciais de afiliado e das sessões do WhatsApp; sem ela nada é salvo | nunca |
| `OFERTAS_CHAVE_CRIPTO_ANTERIOR` | mesmos lugares, só durante uma troca de chave | abre o que foi cifrado com a chave antiga | nunca |
| `OFERTAS_WORKER_DB_URL` | worker: segredos da Fly ou `.env` da raiz (computador, gravada por `ferramentas/papel-worker.mjs --alvo dev`) | conexão do papel `ofe_worker` pelo pooler do Supabase | nunca |
| `OFERTAS_WORKER_ID` | worker (Fly ou `.env` da raiz), opcional | nome da instância, gravado nas travas e no batimento; padrão `fly-<hostname>` na Fly e `pc-<nome do computador>` no computador | não |
| `SUPABASE_TESTE_WORKER_DB_URL` | `.env` da raiz | conexão do papel `ofe_worker` no projeto de teste, para os testes de integração do worker; gravada por `ferramentas/papel-worker.mjs --alvo teste` | nunca |

Para gerar a chave: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Guarde uma cópia no cofre do dono: sem ela, credenciais e sessões salvas não abrem e precisam ser cadastradas de novo.

Nenhuma variável `NEXT_PUBLIC_*` existe. O CI falha se "service_role" aparecer em `.next/static`.
