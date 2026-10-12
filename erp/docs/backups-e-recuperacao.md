# Backups e recuperação

O plano Free do Supabase não faz backup. Enquanto o ERP for a fonte de verdade do financeiro, a rotina abaixo é obrigatória; o Pro (US$ 25/mês) traz backup diário e dispensa o artefato semanal, mas a restauração testada continua valendo.

## Rotina

- `.github/workflows/backup.yml` roda toda segunda às 3h (São Paulo) e sob demanda.
- Faz `pg_dump` (formato custom) dos schemas `public`, `app`, `auth` e `storage`, cifra com `gpg` simétrico (AES256) ainda no runner e guarda como artefato do GitHub por 90 dias. O dump em claro é apagado no mesmo passo.
- Segredos do repositório (Settings > Secrets and variables > Actions):
  - `SUPABASE_DB_URL`: string de conexão do projeto de produção (Supabase > Project Settings > Database > Connection string, modo session, com a senha do banco). Nunca a URL do pooler em modo transaction para `pg_dump`.
  - `BACKUP_PASSPHRASE`: senha longa gerada uma vez e guardada no gerenciador de senhas. Sem ela o backup não abre.
  - `SUPABASE_TESTE_DB_URL`: string do projeto `fcs-os-teste`, usada só na restauração de teste.
- Os arquivos do Storage (fotos, STL, comprovantes, anexos) não entram no dump: só os metadados. Enquanto a biblioteca grande fica no OneDrive por referência (hipótese D8), o que está no Storage precisa de cópia à parte: `supabase storage` pelo CLI ou download pelo painel, mensal.

## Restauração testada

1. Actions > backup > Run workflow, campo `restaurar_no_teste` = `RESTAURAR`.
2. O job `restaurar-no-teste` baixa o último dump, decifra, faz `pg_restore --clean` só do schema `public` no projeto de teste e imprime contagens de produtos, pedidos, lançamentos e migrações.
3. Conferir que as contagens batem com a produção (Relatórios ou `node ferramentas/sql.mjs "select count(*) from pedidos"`). Registrar a data em `docs/validacao.md`.
4. Fazer isso na primeira semana após o `/salvar` que publicar este workflow e depois a cada trimestre.

Situação em 12/10/2026: o workflow foi escrito e revisado, mas ainda não rodou, porque o repositório só é enviado ao GitHub pelo usuário (`/salvar`) e os três segredos ainda não existem. A primeira execução com `RESTAURAR` é o teste de restauração pendente.

## Restauração em produção

Só com decisão explícita, porque sobrescreve o que estiver no banco:

```
gpg --decrypt --output fcs-os.dump fcs-os-AAAA-MM-DD.dump.gpg
pg_restore --dbname="$SUPABASE_DB_URL" --clean --if-exists --no-owner --no-privileges --schema=public fcs-os.dump
```

Antes, pausar o uso (ninguém logado), depois rodar `npm run migrar -- --alvo dev` para garantir que as migrações posteriores ao dump estão aplicadas e `npm run tipos`.

## Pausa do Free

Projeto Free pausa após 7 dias sem requisição. O job de alertas (pg_cron, todo dia) só roda com o banco acordado; o próprio uso diário do painel mantém o projeto ativo. Em férias, abrir o painel uma vez por semana ou aceitar a pausa e reativar no painel do Supabase na volta (os dados não se perdem).
