# Variáveis de ambiente

| Variável | Onde | Uso | Vai ao navegador? |
|---|---|---|---|
| `SUPABASE_URL` | `erp/.env.local`, host | URL do projeto | não (só servidor) |
| `SUPABASE_ANON_KEY` | `erp/.env.local`, host | cliente com sessão (RLS vale) | não |
| `SUPABASE_SERVICE_ROLE_KEY` | `erp/.env.local`, host | criar usuário, listar e-mails | nunca |
| `E2E_EMAIL`, `E2E_SENHA` | `erp/.env.local` | testes e2e | não |
| `SUPABASE_ACCESS_TOKEN` | `.env` da raiz | Management API (migrações, projeto de teste) | nunca |
| `SUPABASE_PROJECT_REF` | `.env` da raiz | alvo dev | não |
| `SUPABASE_TESTE_*` | `.env` da raiz | projeto de teste (ref, url, chaves, senha do banco) | não |

Nenhuma variável `NEXT_PUBLIC_*` existe. O CI falha se "service_role" aparecer em `.next/static`.
