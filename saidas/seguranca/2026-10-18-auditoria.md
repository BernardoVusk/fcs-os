---
data: 2026-10-18
escopo: módulo Grupos de Ofertas do FCS ERP na branch erp-ofertas (commits dbb2d03..3867722), migrações 0021 a 0028, erp/src/{integracoes,dominio/ofertas,acoes/ofertas,dados/ofertas,componentes/ofertas,app/(painel)/ofertas}, erp/src/lib/cripto.ts e o worker erp/worker
matrizes_aplicaveis: 10
achados: { critico: 0, alto: 0, medio: 0, baixo: 4 }
---

# Auditoria de segurança: Grupos de Ofertas

## Resumo executivo

Não há achado crítico, alto nem médio. Quem não tem login não alcança nada do módulo: toda tabela nova tem RLS, nenhuma função do módulo aceita o papel anônimo e o worker não abre porta. As credenciais da Shopee e da Awin ficam cifradas no banco e só são abertas no servidor; nenhuma delas aparece na tela, no pacote do navegador nem no repositório. Toda ação do servidor confere o papel antes de gravar, e as funções do banco conferem de novo.

O que apareceu é reforço. Se o worker for comprometido, ele consegue mudar mais coisa no cadastro de grupos do que precisa. As imagens de oferta ficam abertas a quem tiver o endereço exato, com os metadados da foto. O limite de chamadas vale só por instância e só na análise de URL. A imagem Docker do worker e o CI não travam versão e vulnerabilidade como poderiam.

**Se eu fosse atacar esse sistema hoje, eu começaria por:** uma dependência da Baileys. É o único ponto em que código de terceiros roda com acesso às sessões do WhatsApp e à chave de cifra. A versão está fixada, os scripts de instalação estão desligados e o papel do banco é restrito, mas esse é o risco que o plano aceitou ao escolher o worker próprio.

## Achados por severidade

| # | Matriz | Problema | Severidade | Confiança | Local |
|---|---|---|---|---|---|
| 1 | 5 | Papel do worker pode alterar qualquer coluna do cadastro de grupos (autorização de origem, função, tag da Amazon) | Baixo | CONFIRMADO | `supabase/migrations/0024_ofertas_whatsapp.sql:437` |
| 2 | 7 | Imagens de oferta em bucket público, sem tirar EXIF e com tipo validado só pelo que o navegador declara | Baixo | CONFIRMADO | `supabase/migrations/0025_ofertas_fila.sql:11`, `erp/src/acoes/upload.ts:136` |
| 3 | 6 | Limite de chamadas em memória (por instância) e só em `analisarUrl`; importações e sincronização com Awin e Shopee sem limite | Baixo | CONFIRMADO | `erp/src/acoes/ofertas/ofertas.ts:36`, `erp/src/lib/limite.ts:1` |
| 4 | 13 | Imagem base do worker sem digest fixo e CI sem barreira de `npm audit` | Baixo | CONFIRMADO | `erp/worker/Dockerfile:3`, `.github/workflows/ci.yml` |

## Detalhamento

```
[MATRIZ 5] Papel do worker pode alterar qualquer coluna de ofe_grupos
Severidade:  Baixo
Confiança:   CONFIRMADO
Local:       supabase/migrations/0024_ofertas_whatsapp.sql:437 e 0023_ofertas_publicacao.sql:341
Evidência:   grant select, insert, update on public.ofe_grupos to ofe_worker;
             create policy ofe_grupos_worker on public.ofe_grupos for all to ofe_worker using (true) with check (true);
Impacto:     O worker só precisa gravar nome, número coletor, início da coleta e "só admins"
             (função ofe_w_sincronizar_grupos, linhas 359 a 371). Com o grant da tabela inteira, um
             worker comprometido consegue marcar um grupo como origem autorizada (autorizado_em,
             funcao = 'origem'), o que no ERP é ação só do dono, e trocar a tag_amazon de um grupo.
             A troca da tag sobrevive à limpeza do worker: os posts do modo assistido continuam saindo
             com a tag errada até alguém notar. Exige comprometer o worker antes, por isso é baixo.
Correção:    migração nova (0029), sem mudar o comportamento da sincronização:

  revoke insert, update on public.ofe_grupos from ofe_worker;
  grant insert (nome, funcao, cadastro, jid, numero_coletor_id, coleta_iniciada_em, so_admins)
    on public.ofe_grupos to ofe_worker;
  grant update (nome, numero_coletor_id, coleta_iniciada_em, so_admins) on public.ofe_grupos to ofe_worker;
  drop policy ofe_grupos_worker on public.ofe_grupos;
  create policy ofe_grupos_worker_ler on public.ofe_grupos for select to ofe_worker using (true);
  create policy ofe_grupos_worker_inserir on public.ofe_grupos for insert to ofe_worker
    with check (funcao = 'nenhuma' and cadastro = 'sincronizado' and autorizado_em is null);
  create policy ofe_grupos_worker_atualizar on public.ofe_grupos for update to ofe_worker
    using (true) with check (true);

  Teste de integração: o login ofe_worker não consegue gravar autorizado_em nem tag_amazon.
```

```
[MATRIZ 7] Imagens de oferta públicas, com metadados e tipo declarado
Severidade:  Baixo
Confiança:   CONFIRMADO
Local:       supabase/migrations/0025_ofertas_fila.sql:11 e erp/src/acoes/upload.ts:136
Evidência:   update storage.buckets set public = true where id = 'ofertas-imagens';
             if (!TIPOS_IMAGEM_OFERTA.includes(d.mime) || !EXTENSOES.imagem.test(d.nomeArquivo))
Impacto:     O bucket ficou público para o worker baixar a imagem sem service role. Listar o bucket
             continua bloqueado (sem policy de leitura para anônimo), então só abre quem tem o caminho
             exato (mês, milissegundo e nome do arquivo). O arquivo fica como foi enviado: uma foto de
             celular leva o EXIF junto, inclusive a localização, se estiver ligada. O tipo vem do
             navegador; o bucket só aceita png, jpeg e webp declarados, sem conferir o conteúdo.
             O texto da mensagem não leva esse endereço, então a exposição depende de alguém obter o link.
Correção:    no navegador, antes de pedir a URL assinada, redesenhar a imagem num canvas e enviar o
             resultado. Isso tira o EXIF e confirma que o arquivo é imagem de verdade:

  async function limparImagem(arquivo: File): Promise<File> {
    const bitmap = await createImageBitmap(arquivo); // falha se não for imagem
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
    return new File([blob], arquivo.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  }

  Muda o formato salvo para JPEG (PNG com transparência perde a transparência). Voltar o bucket
  a privado exigiria dar ao worker acesso de service role ao Storage, o que o desenho evitou.
```

```
[MATRIZ 6] Limite de chamadas por instância e só na análise de URL
Severidade:  Baixo
Confiança:   CONFIRMADO
Local:       erp/src/acoes/ofertas/ofertas.ts:36 e erp/src/lib/limite.ts:1
Evidência:   const limite = new Limitador(30, 60_000);
             /** Janela deslizante em memória: até `maximo` chamadas por `janelaMs` por chave (token). */
Impacto:     Na Vercel cada instância tem sua memória, então os 30 por minuto não somam entre
             instâncias. importarAwin, importarShopee, sincronizarCuponsAwin e testarConversao chamam
             as APIs sem limite próprio. Um operador logado (ou uma sessão roubada de operador) clicando
             em sequência pode estourar a cota da Awin (20 chamadas por minuto por token) e a Awin
             passa a recusar o token por um tempo: param a geração de link e a sincronização de cupons.
             Não expõe dado nem custo.
Correção:    aplicar o mesmo Limitador por usuário nessas quatro ações (ex.: 6 por minuto) e registrar
             em docs/arquitetura.md que o limite é por instância. Limite global exigiria uma tabela de
             contagem no banco; não compensa para dois ou três usuários.
```

```
[MATRIZ 13] Imagem base sem digest e CI sem barreira de auditoria
Severidade:  Baixo
Confiança:   CONFIRMADO
Local:       erp/worker/Dockerfile:3 e .github/workflows/ci.yml
Evidência:   FROM node:22-slim
             (nenhuma ocorrência de "audit" em .github/workflows/*.yml)
Impacto:     Cada fly deploy pode puxar uma imagem node:22-slim diferente da testada. O CI passa mesmo
             que uma dependência de produção ganhe vulnerabilidade alta. Hoje o npm audit de produção
             dá zero no ERP e zero no worker.
Correção:    fixar o digest no Dockerfile (FROM node:22-slim@sha256:<digest>, lido com
             `docker buildx imagetools inspect node:22-slim` na hora de aplicar) e acrescentar ao CI:
               - run: npm audit --omit=dev --audit-level=high
               - run: npm audit --omit=dev --audit-level=high --prefix worker
```

## Matrizes verificadas sem achado

- **Matriz 1, segredos.** Nenhum `.env` versionado (só `.env.example`); busca por chave, JWT e URL de banco com senha no repositório só achou montagem de string em `erp/ferramentas/papel-worker.mjs:28` e textos de teste. Nenhum `NEXT_PUBLIC_` novo. O service role aparece só em `erp/src/integracoes/credenciais.ts`, marcado `server-only`. Segredos cifrados com AES-256-GCM e contexto como dado autenticado (`erp/src/lib/cripto.ts:35`); `ofe_integracoes_segredos` não tem policy para a sessão. O log do worker passa por `redigir` e `contemSegredo` e o logger da Baileys é silencioso (`erp/worker/src/log.ts`). Na Fase 16, o build do `.next` foi varrido: o valor da chave não aparece, só o nome da variável dentro de uma mensagem de erro.
- **Matriz 2, autorização.** Sistema de uma empresa só, sem dado de outro cliente. Das 57 ações exportadas em `erp/src/acoes/ofertas/`, 56 passam por `exigirEscrita` (direto ou pelos auxiliares `escrita()` e `dono()`), assim como a de upload de imagem. A exceção, `consultarConexao`, só lê: confere `podeLer` e lê o QR por RLS, que só libera ao dono. As 19 funções `security definer` liberadas à sessão conferem `pode_escrever` ou `eh_dono` por dentro. A exportação de CSV confere o papel (`exportar/route.ts:15`).
- **Matriz 4, corrida.** Reserva com `for update skip locked`, índice único de um envio em processamento por número, `unique (publicacao_id, grupo_id)`, `ofe_marcar_publicado` com `where status = 'aguardando'`, importação idempotente por hash do arquivo e copiador sob `pg_advisory_xact_lock`. Testes de integração cobrem duas reservas simultâneas e a reserva vencida com despacho iniciado (`testes/integracao/ofertas-fila.test.ts:158` e `:168`).
- **Matriz 5, RLS (fora o achado 1).** As 32 tabelas `ofe_` têm RLS ligada. O anônimo não tem policy em nenhuma e não executa nenhuma função `public.ofe_*`. As funções só do worker (`ofe_w_*`, `ofe_reservar_envio`, `ofe_marcar_despacho`, `ofe_concluir_envio`) não são executáveis pela sessão. O anônimo herda os grants padrão do Supabase nas tabelas, inclusive TRUNCATE, mas nenhum caminho da API faz TRUNCATE e as outras operações caem na RLS; é o mesmo padrão do resto do ERP.
- **Matriz 8, SSRF.** `erp/src/integracoes/http.ts`: só https, porta 443, sem usuário e senha na URL, sem IP literal, host da lista da plataforma, IP privado recusado depois do DNS, cada redirecionamento revalidado (no máximo 3), chamada de API com `redirect: "error"`, tempo limite e corpo limitado. A janela de DNS rebinding entre a checagem e o fetch está documentada como risco aceito; só passam hosts de marketplace conhecidos. Formas IPv6 menos comuns (NAT64, mapeado em hexadecimal) não estão na lista de privados, mas não há como chegar a elas sem controlar o DNS de um desses hosts.
- **Matriz 9, XSS e SQL.** Nenhum `dangerouslySetInnerHTML` no módulo; texto de terceiros (mensagens de origem, nome de grupo sincronizado) é renderizado como texto pelo React. `link_convite` tem check no banco (`^https://chat\.whatsapp\.com/...`). Nenhum SQL dinâmico nas migrações 0021 a 0028. O único filtro `.or()` com entrada do usuário tira `%`, vírgula e parênteses antes (`erp/src/dados/ofertas/relatorios.ts:125`). O CSV exportado protege contra fórmula (`erp/src/dominio/relatorios/csv.ts:6`). Server actions têm a checagem de origem do Next; a única rota GET do módulo não grava nada.
- **Matriz 12, cache.** Nenhuma rota de `/ofertas` sai pré-renderizada (`prerender-manifest.json` sem entradas do módulo); a exportação responde `cache-control: no-store`.
- **Matriz 13, dependências (fora o achado 4).** `npm audit --omit=dev`: zero no ERP e zero no worker. Worker com versões exatas, lockfile, `npm ci --ignore-scripts` no Dockerfile e no CI, sem dependência vinda de git. As 9 altas do `npm audit` completo do ERP estão só em ferramenta de desenvolvimento (`braces` via `eslint-config-next` e o CLI do `shadcn`, GHSA-vfj7-8cjw-p6xm), já existiam antes do módulo e não vão para o pacote publicado. A correção sugerida pelo npm rebaixa o `eslint-config-next` para 14.2.35, então não convém aplicar.

## Não verificável daqui

- **Variáveis na Vercel e segredos na Fly:** `OFERTAS_CHAVE_CRIPTO` ainda não foi cadastrada na Vercel e o worker ainda não foi publicado. Conferir no painel depois do deploy que nenhuma delas é `NEXT_PUBLIC_` e que a Fly não tem `[http_service]`.
- **Comportamento real da Baileys:** o spike com número dedicado não foi feito. Falta confirmar, com o worker rodando, que QR, código de pareamento e estado de sessão não aparecem em `fly logs`.
- **Restrições de rede do Supabase:** se o pooler aceita conexão de qualquer IP. O papel `ofe_worker` usa senha aleatória longa; restringir a rede é configuração do painel.
- **Respostas reais da Shopee e da Awin:** os adaptadores tratam erro e redigem segredo, mas o formato da resposta de erro de cada API só se confirma com credencial aprovada.
- **MFA do dono:** a exigência de segundo fator existe no proxy, mas o dono ainda não ativou. Enquanto não ativar, a senha sozinha dá acesso às credenciais e aos números.

## Risco aceito pelo desenho

O worker precisa ler `ofe_integracoes_segredos` e `ofe_sessoes` e ter a chave de cifra para gerar link e manter a sessão do WhatsApp. Se uma dependência dele for comprometida, as credenciais da Shopee e da Awin e as sessões dos números ficam expostas. O que limita o estrago: versão exata, scripts de instalação desligados, papel de banco sem acesso a financeiro, clientes e usuários (testado), máquina sem porta de entrada e números dedicados. Se acontecer: trocar `OFERTAS_CHAVE_CRIPTO`, gerar credenciais novas na Shopee e na Awin, desconectar os números pelo celular e rodar `node ferramentas/papel-worker.mjs` para trocar a senha do papel.

## Ordem de correção recomendada

1. Achado 1 (grants do worker em `ofe_grupos`): migração pequena, sem efeito para quem usa.
2. Achado 4 (CI com `npm audit` e digest do Dockerfile): duas linhas no CI; o digest entra antes do primeiro `fly deploy`.
3. Achado 3 (limite nas ações que chamam API): uma linha por ação.
4. Achado 2 (EXIF e conteúdo da imagem): muda o formato salvo para JPEG; decidir se vale.
5. Antes de ligar o worker em produção: ativar o MFA do dono.
