# Sorteio pós-compra: panfleto, página de cadastro e base de clientes

## Contexto

Hoje a FCS 3D STUDIO vende só em marketplace (Shopee, Mercado Livre, TikTok Shop) e não tem cadastro próprio dos compradores. Sem isso não existe campanha de recompra. A ideia aprovada: cada pedido enviado leva um panfleto impresso com agradecimento, pedido de avaliação e um QR code para uma página de cadastro em sorteio mensal. Quem preenche cai na base de clientes do FCS ERP e é levado ao grupo do WhatsApp.

Decisões já tomadas com o usuário (15/10/2026):
- Panfleto impresso em gráfica, 10x15 cm, fundo preto chapado na identidade da marca.
- Prêmio: um produto do catálogo por mês, sorteado entre os cadastrados do mês.
- Endereço do QR: `https://fcs-erp.vercel.app/sorteio` (domínio próprio fica para depois; o endereço antigo continua valendo com redirect).
- Formulário com campo extra "onde você comprou" (Shopee, Mercado Livre, TikTok Shop).

Fato que muda o plano: a tabela `produtos` do ERP está vazia em produção (consulta em 15/10/2026). A lista suspensa de produtos depende do catálogo estar cadastrado no ERP. Isso vira pré-requisito (Fase 0).

## Abordagem escolhida

Página pública dentro do próprio ERP (`/sorteio`), não um site separado. Motivos: mesma base Supabase (o cadastro cai direto em `clientes`), deploy automático pela Vercel já configurado, fontes e componentes prontos, nenhum custo novo. Alternativas descartadas: site estático separado com API (duplica deploy e chaves) e formulário de terceiros (Google Forms, Tally) com importação manual (quebra o "vai para o sistema" e exige rotina).

Riscos a conhecer antes de imprimir (decisão do usuário, não bloqueiam o plano):
1. **Lei 5.768/1971 e Portaria SECAP 41/2008**: sorteio promocional com prêmio exige autorização da SECAP (Ministério da Fazenda); sem ela há risco de multa. Muita loja pequena faz sorteio no Instagram sem autorização, mas o risco existe. Alternativa que não exige autorização e usa a mesma página: concurso cultural (ex: melhor foto da peça em uso, escolhida pela loja), que ainda rende fotos para o marketing. O formulário e a base são os mesmos; só muda o texto do verso do panfleto e o regulamento.
2. **Políticas dos marketplaces**: Shopee e Mercado Livre proíbem recompensa por avaliação. O panfleto mantém o pedido de avaliação e o sorteio em blocos separados, e o texto do sorteio nunca condiciona nada à avaliação. O Mercado Livre também restringe material que desvia o comprador para outro canal; o texto fala de grupo e encomenda, nunca de "compre direto mais barato".
3. **LGPD**: a página tem caixa de consentimento obrigatória para receber mensagens, linha de privacidade e o ERP já tem `anonimizar_cliente` para pedidos de remoção.

## Fases e ordem

| Fase | Entrega | Depende de |
|---|---|---|
| 0 | Catálogo no ERP, fotos, link do grupo, regras do sorteio | usuário |
| 1 | ERP: migração, função, página pública `/sorteio`, testes, deploy | Fase 0 (catálogo) |
| 2 | Panfleto 10x15: HTML, QR, PDF para gráfica, PNG de prova | Fase 1 no ar (QR precisa apontar para página viva) |
| 3 | ERP: tela interna `/vendas/sorteio` com lista, exportação e botão de sortear | Fase 1 |
| 4 | Rotina mensal (checklist; pode virar skill `/sorteio-mensal` depois) | Fase 3 |

A Fase 2 pode começar em paralelo com a Fase 1 (texto e layout), mas o PDF só vai para a gráfica depois de testar o QR na página publicada.

---

## Fase 0: pré-requisitos (tarefas do usuário, com apoio)

1. **Catálogo no ERP.** Importar `dados/catalogo/2026-08-21-catalogo.csv` pela tela Catálogo > Importar (a função `nomeSugerido` em `erp/src/dominio/produtos/importacao-csv.ts:135` já encurta o título no primeiro separador). Depois: unir anúncios repetidos entre canais (a pista F1 está nos três), ajustar o nome curto de cada produto (é o que aparece na lista suspensa) e marcar `status = ativo` só nos que vendem. Resultado esperado: cerca de 25 produtos ativos com nome limpo.
2. **Fotos.** De 8 a 12 fotos de peças impressas (quadradas ou horizontais, mínimo 1200 px no lado maior), salvas em `identidade/fotos-produto/`. O script da Fase 1 gera as versões leves em webp.
3. **Grupo do WhatsApp.** Criar o grupo e copiar o link de convite. Vai na variável `SORTEIO_WHATSAPP_URL` (Vercel e `.env` da raiz), nunca em arquivo versionado.
4. **Regras do sorteio** a confirmar antes do texto final (propostas, não números do negócio): valor máximo do prêmio (proposta: até R$ 50 em produto do catálogo, frete por conta da loja), data (último dia útil do mês, entre cadastros daquele mês), uma inscrição por pedido, ganhador avisado por WhatsApp e e-mail.
5. **Handle do Instagram** (se existir) para o rodapé do panfleto. Não está registrado na memória.

---

## Fase 1: ERP, página pública de cadastro

Detalhamento técnico na seção "Plano técnico do ERP" abaixo (migração 0020, função `inscrever_sorteio`, action pública, página, testes e docs).

Estrutura da página `/sorteio` (mobile primeiro, dark fixo com as cores do `identidade/design-guide.md`, fontes já carregadas pelo layout raiz: Chakra Petch para títulos, Inter para corpo):

1. **Cabeçalho**: wordmark do logo, nada mais.
2. **Hero**: kicker "SORTEIO TODO MÊS"; título "Obrigado por comprar com a gente"; texto "Cadastre seu pedido abaixo e concorra a um produto do nosso catálogo. Leva um minuto."; botão "Cadastrar" (âncora para o formulário).
3. **Carrossel infinito de fotos**: faixa única, só CSS (trilho duplicado com `animation: translateX(-50%)`), 8 a 12 fotos webp de `erp/public/sorteio/`, altura 200 a 240 px, pausa em `prefers-reduced-motion`. Sem JavaScript.
4. **O que a gente faz**: três cards (regra do design-guide: componente antes de parágrafo): "Impressão sob demanda" (cada peça sai da impressora depois do pedido), "Games, miniaturas, F1 e carros" (o que a gente mais imprime), "Encomenda pelo WhatsApp" (tem um modelo ou uma ideia? a gente orça, imprime e envia).
5. **Formulário** (card com borda ciano 20%, cantos chanfrados): Nome; E-mail; WhatsApp (telefone, `inputmode="tel"`); Onde você comprou (três botões segmentados: Shopee, Mercado Livre, TikTok Shop); Qual produto você comprou (select com os produtos ativos do ERP + opção "Outro", que abre campo de texto curto); caixa "Aceito receber mensagens da FCS 3D STUDIO sobre o sorteio e novidades"; campo oculto anti-robô; botão "Cadastrar e entrar no grupo".
6. **Estado de sucesso** (substitui o formulário): "Cadastro feito. Agora é só entrar no grupo." + botão grande "Entrar no grupo do WhatsApp" + redirecionamento automático em 2 s (o botão fica porque alguns navegadores bloqueiam redirect para `wa.me`/`chat.whatsapp.com`).
7. **Regulamento** (bloco recolhível `details`): quem participa, uma inscrição por pedido, data do sorteio, como o ganhador é avisado, prêmio, prazo para responder, privacidade dos dados.
8. **Rodapé**: "FCS 3D STUDIO. Lojas na Shopee, Mercado Livre e TikTok Shop." + "Seus dados ficam com a gente e não são repassados. Para remover, fale no WhatsApp."

A página lê `?via=` (lista fechada: `panfleto`, `instagram`, `outro`; padrão `panfleto`) e guarda em `inscricoes_sorteio.origem` para medir o panfleto separado de outros usos do link. O QR do panfleto aponta para `https://fcs-erp.vercel.app/sorteio?via=panfleto`.

Metadados: título "Sorteio FCS 3D STUDIO", descrição curta, `robots: index` liberado só nessa página (o layout raiz é `noindex`).

Desempenho alvo: sem JS além do formulário, imagens com `width`/`height` e `loading="lazy"`, página total abaixo de 1 MB, Lighthouse mobile acima de 90.

---

## Fase 2: panfleto 10x15 cm para gráfica

**Pasta:** `marketing/panfleto-sorteio/` (peça de marketing reutilizada; versão pelo git, sem data no nome).

**Arquivos:**
- `panfleto.html`: duas faces como `<section class="face frente">` e `<section class="face verso">`, CSS inline, fontes Chakra Petch e Poppins do Google Fonts (mesma regra da skill `/carrossel`).
- `qr.svg`: gerado com `npx --yes qrcode -t svg -e M -w 600 -o qr.svg "https://fcs-erp.vercel.app/sorteio?via=panfleto"`. Correção M. Módulos pretos sobre quadro branco (QR invertido falha em parte das câmeras); o quadro branco é um elemento dentro do fundo preto, com moldura ciano chanfrada, o que respeita o design-guide.
- `render.mjs`: Playwright (reusa `erp/node_modules` via `NODE_PATH`, como a `/carrossel`): espera `document.fonts.ready`, gera `panfleto.pdf` com duas páginas de 106x156 mm (`printBackground: true`, sangria de 3 mm já incluída no HTML) e `frente.png` / `verso.png` em 300 dpi (1252x1842 px) para prova.
- `texto.md`: texto final aprovado + 3 opções de frase de agradecimento + especificação de gráfica.
- `logo-wordmark.png`: cópia de `motion/public/logo/fcs-ciano-wordmark.png` (recorte transparente já existente; copiar porque `motion/` ainda não está versionado).

**Especificação para a gráfica:** 10x15 cm fechado, 4/4 cores (frente e verso coloridos), couché fosco 250 g ou 300 g, sangria 3 mm, margem de segurança 5 mm, sem verniz. Fundo em preto rico (o RGB #0A0A0A converte para CMYK escuro; se a gráfica pedir, usar C60 M40 Y40 K100). O ciano #00D8FF sai um pouco menos vivo em CMYK; é esperado. Pedir prova digital antes do lote; tiragem inicial sugerida de 250 (mais barato por unidade e dá para corrigir texto na segunda leva).

**Texto da frente** (agradecimento + avaliação; Chakra Petch em caixa alta nos títulos, Poppins no corpo, sem emoji, sem travessão):

- Logo wordmark no topo (cerca de 40 mm de largura).
- Título: OBRIGADO PELA COMPRA
- Frase de agradecimento (três opções, a primeira é a padrão):
  1. "Essa peça saiu da nossa impressora direto pra você. Camada por camada, feita sob demanda."
  2. "Cada peça que a gente imprime leva horas de máquina e um pedaço do nosso hobby. Agora ela é sua."
  3. "Você comprou de um estúdio pequeno que imprime cada peça depois do pedido. Obrigado por fazer parte disso."
- Bloco de avaliação (card com borda ciano): título SUA AVALIAÇÃO FAZ DIFERENÇA; texto "Uma avaliação com foto, na loja onde você comprou, ajuda muito um estúdio pequeno como o nosso. Leva um minuto e vale demais pra gente."
- Linha de apoio: "Algum problema com a peça? Fala com a gente pelo chat da loja antes de avaliar. A gente resolve."
- Rodapé: "fcs3dstudio na Shopee, Mercado Livre e TikTok Shop" (+ Instagram se houver).

**Texto do verso** (sorteio + QR):

- Kicker: SORTEIO TODO MÊS
- Título: CADASTRE SEU PEDIDO E CONCORRA
- Texto: "Todo mês sorteamos um produto do nosso catálogo entre os clientes cadastrados. Aponte a câmera pro código, preencha em um minuto e entre no nosso grupo do WhatsApp."
- QR code de 45 a 50 mm em quadro branco com moldura ciano.
- Endereço em texto: fcs-erp.vercel.app/sorteio
- Linha final: "Sorteio mensal entre clientes cadastrados. Regulamento na página. O cadastro não depende da avaliação."

Layout: muito espaço vazio, poucos elementos, produto não aparece no panfleto (o protagonista é o QR e o texto curto). Hierarquia por tamanho e cor: título em ciano, corpo em branco, apoio em cinza #A3AAB3.

**Aprovação:** mostrar `frente.png` e `verso.png`; imprimir uma prova caseira em A4 (escala 100%) e testar o QR com dois celulares (câmera do iPhone e do Android) antes de mandar para a gráfica.

---

## Fase 3: ERP, tela interna `/vendas/sorteio`

Lista das inscrições com filtro de mês (referência `AAAA-MM`), contagem, tabela (nome, contato, produto, canal, aceita contato, origem, data), exportação CSV no padrão de `erp/src/dominio/relatorios/csv.ts`, botão "Sortear ganhador do mês" (só `dono`) que chama a função SQL `realizar_sorteio`, grava em `sorteios` e mostra o ganhador. Entrada no menu Vendas. Detalhe na seção técnica.

---

## Fase 4: rotina mensal (uma pessoa, meia hora por mês)

1. Último dia útil: abrir `/vendas/sorteio`, filtrar o mês, clicar em Sortear.
2. Avisar o ganhador por WhatsApp e e-mail; combinar o produto e o endereço; criar o pedido no ERP com canal "Venda direta" e valor zero.
3. Postar o resultado no grupo (sem expor dados além do primeiro nome).
4. Exportar o CSV do mês para a campanha de recompra (quem aceitou contato).

Se repetir três meses, vira skill `/sorteio-mensal`.

---

## Plano técnico do ERP

Ordem de execução: passos 1 a 4 colocam a página pública no ar (ponto de publicação); 5 e 6 entregam a tela interna. Antes do passo 1, salvar este plano como spec em `erp/docs/superpowers/specs/2026-10-15-sorteio-panfleto-design.md` (convenção do repositório). Commit por fase com `/salvar`.

### Passo 1. Migração `supabase/migrations/0020_sorteio.sql`

Função imutável `app.telefone_digitos(text)` (só dígitos, remove o 55 do país quando tem 12 ou 13 dígitos), índices em `clientes` por `lower(email)` e por `app.telefone_digitos(telefone)` (hoje não existe nenhum; a busca de cliente existente precisa deles).

Tabela `inscricoes_sorteio`: `id`, `cliente_id` (fk clientes, not null), `produto_id` (fk produtos, nulo quando "Outro"), `produto_outro` (até 120), `canal_id` (fk canais_venda, not null), `aceita_contato` boolean, `origem` text not null default `'panfleto'` check in (`panfleto`, `instagram`, `outro`), `ip_hash` (até 64), `user_agent` (até 300), `referencia` text default `to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM')` com check `^\d{4}-\d{2}$`, `criado_em`; check `produto_id is not null or produto_outro is not null`. Índices `(referencia, criado_em desc)` e `(cliente_id, criado_em desc)`. Trigger `app.auditar()`. RLS: select para `authenticated` com `app.usuario_ativo()`; sem policy de escrita (só a service role grava, pela função).

Tabela `sorteios`: `id`, `referencia` unique com o mesmo check, `inscricao_id` fk, `sorteado_em`, `sorteado_por uuid default app.usuario_da_requisicao()`. Trigger `app.auditar()`. RLS: select para authenticated ativo; insert só `app.eh_dono()`.

View `inscricoes_sorteio_meses` (`security_invoker = true`): `referencia, count(*)` para o filtro da tela.

Função `public.inscrever_sorteio(p_nome, p_email, p_telefone, p_canal, p_produto uuid, p_produto_outro, p_aceita_contato, p_origem, p_ip_hash, p_user_agent) returns jsonb`, `security invoker`, `set search_path = public, pg_temp`:
1. Valida e levanta chaves conhecidas: `nome_obrigatorio`, `email_invalido` (regex simples), `telefone_invalido` (`^\d{10,11}$`), `consentimento_obrigatorio`, `canal_obrigatorio` (resolve `canais_venda` por `tipo` ativo), `produto_obrigatorio` (produto precisa existir com `status = 'ativo'`, ou `produto_outro` preenchido), `origem` fora da lista vira `outro`.
2. Limite independente da instância: mais de 20 inscrições do mesmo `ip_hash` na última hora levanta `muitas_tentativas`.
3. Procura cliente não anonimizado por `lower(email)`, depois por `app.telefone_digitos(telefone)`.
4. Se o cliente existe e já tem inscrição com o mesmo produto nas últimas 24 h, devolve `{repetida: true}` sem gravar.
5. Cliente novo: insert em `clientes` com `canal_origem_id` = canal escolhido e `observacoes` = "Cadastro pelo sorteio (QR do panfleto) em dd/mm/aaaa". Cliente existente: preenche e-mail ou telefone só se estiverem nulos (nunca sobrescreve) e acrescenta a mesma linha em `observacoes`.
6. Insert em `inscricoes_sorteio`; devolve `{cliente_id, inscricao_id, repetida: false, cliente_novo}`.
7. `revoke execute ... from public, anon, authenticated; grant execute ... to service_role`.

Função `public.realizar_sorteio(p_referencia text) returns jsonb`, `security invoker`: exige `app.eh_dono()` (levanta `sem_permissao`), valida a referência (`data_invalida`), recusa mês já sorteado (`sorteio_ja_realizado`), escolhe `order by random() limit 1` entre inscrições do mês com `aceita_contato` e cliente não anonimizado, grava em `sorteios` (o unique protege clique duplo: 23505 vira `duplicado`), devolve o ganhador com nome, e-mail, telefone e produto; sem inscrição elegível levanta `sem_inscricoes`. `revoke from public, anon; grant to authenticated, service_role`.

Verificar: `npm run migrar -- --alvo dev && npm run migrar -- --alvo teste && npm run tipos`, depois `node ferramentas/sql.mjs "select proname, proacl from pg_proc where proname in ('inscrever_sorteio','realizar_sorteio')"` (anon e authenticated não aparecem na primeira).

### Passo 2. Domínio, lib e chaves de erro

- `erp/src/dominio/clientes/telefone.ts` + teste: `normalizarTelefone(texto)` (só dígitos, tira 55 inicial com 12 ou 13 dígitos, aceita 10 ou 11, senão `null`) e `formatarTelefone(digitos)` para `(31) 99999-9999`.
- `erp/src/dominio/sorteio/referencia.ts` + teste: `referenciaAtual(agora)` com `TZDate` de `@date-fns/tz` em America/Sao_Paulo (testar a virada de mês em UTC), `referenciaValida(v)`, `rotuloReferencia("2026-10")` = "outubro de 2026".
- `erp/src/dominio/sorteio/inscricao.ts` + teste: `CANAIS_SORTEIO` (shopee, mercado_livre, tiktok_shop com rótulo), `ORIGENS_SORTEIO`, e o `inscricaoSchema` zod v4 (nome 2 a 160; `z.email()`; telefone com `transform` que normaliza ou emite `telefone_invalido`; `canal` enum; `produto_id` uuid ou literal `"outro"`; `produto_outro` até 120, obrigatório quando `produto_id = "outro"` via `superRefine`; `aceita_contato` literal `"on"` com erro `consentimento_obrigatorio`). Fica em `dominio/` para ser testável fora do arquivo `"use server"`.
- `erp/src/dominio/sorteio/planilha.ts` + teste: `tabelaInscricoes(linhas)` devolve `{cabecalho, linhas}` para o CSV (nome, e-mail, telefone formatado, produto, canal, aceita contato, origem, data).
- Mover `erp/src/mcp/limite.ts` para `erp/src/lib/limite.ts` (e o teste); deixar `src/mcp/limite.ts` como `export { Limitador } from "@/lib/limite";` para não tocar `mcp/ferramentas.ts`.
- `erp/src/lib/erros-pt.ts`: adicionar `telefone_invalido`, `consentimento_obrigatorio`, `muitas_tentativas`, `sorteio_ja_realizado`, `sem_inscricoes` (`canal_obrigatorio` já existe na linha 75).

Verificar: `npm test`.

### Passo 3. Página pública `/sorteio`

- `erp/src/lib/supabase/proxy.ts:5`: `LIVRES = ["/login", "/sem-acesso", "/sorteio"]`.
- `erp/src/dados/publico/sorteio.ts` (`import "server-only"`, comentário apontando a exceção em `docs/arquitetura.md`): `listarProdutosSorteio()` com `clienteAdmin("web")`, `select("id, nome")`, `status = ativo`, ordem por nome. Só id e nome saem do servidor.
- `erp/src/acoes/publico/sorteio.ts` (`"use server"`, comentário de cabeçalho: action pública, sem `exigirEscrita`, por quê é segura): IP de `x-forwarded-for` (primeiro) ou `x-real-ip`; `Limitador(10, 10 min)` em nível de módulo (por instância, melhor esforço; o limite firme fica no banco); honeypot `site` preenchido devolve `ok: true` sem gravar; `lerCampos` + `inscricaoSchema.safeParse` + `errosDoZod`; `clienteAdmin("web").rpc("inscrever_sorteio", {...})` com `p_ip_hash = sha256(ip)` e `p_origem` lido do campo oculto `via`; erro vira `{ erros: { _form: chaveDoErro(error) } }`; sucesso `{ erros: {}, ok: true, mensagem: "Inscrição confirmada." }`. Sem `revalidatePath`.
- `erp/src/componentes/sorteio/Marquee.tsx` (servidor): recebe `fotos`, renderiza a lista duas vezes (a segunda com `aria-hidden`) num `overflow-hidden`, trilho `.marquee-faixa` com `next/image` 640x640. Em `globals.css`: `@keyframes marquee { to { transform: translateX(-50%) } }`, `.marquee-faixa { display:flex; width:max-content; animation: marquee 45s linear infinite }` e `animation-play-state: paused` dentro do bloco `prefers-reduced-motion` já existente (linha ~180).
- `erp/src/componentes/sorteio/fotos.ts`: `FOTOS_SORTEIO` gerado pelo script (não ler `public/` em runtime na Vercel).
- `erp/src/componentes/sorteio/FormSorteio.tsx` (`"use client"`): `useActionState(inscreverSorteio, FORM_INICIAL)`; props `produtos`, `whatsappUrl`, `via`. Campos na ordem da Fase 1; canal como três `radio` estilizados de botão; `select` de produto com "Escolha", produtos ativos e "Outro" (estado local revela `produto_outro`); checkbox de consentimento; honeypot `site` fora da tela com `tabIndex={-1}` e `autoComplete="off"`; campo oculto `via`; erros com `erroPt()` e `role="alert"`. Com `estado.ok`: componente `Confirmacao` com link grande para o grupo e `useEffect` com `setTimeout(() => window.location.assign(whatsappUrl), 2000)` quando a URL existe. Não usar `useAoSalvar` nem `Campo`/`SelectNativo` (dependem dos tokens do tema; a página tem cores fixas: `#0A0A0A`, `#141414`, `#1F1F1F`, `#00D8FF`, fonte de título via `var(--fonte-titulo)` já definida no `<html>`).
- `erp/src/app/(publico)/sorteio/page.tsx`: `export const dynamic = "force-dynamic"` (sem cookies lidos, o Next pré-renderizaria a lista de produtos no build); `metadata` com título "Sorteio FCS 3D STUDIO", descrição e `robots: { index: true, follow: true }`; lê `searchParams.via` (lista fechada, padrão `panfleto`), `listarProdutosSorteio()`, `whatsappUrl = process.env.SORTEIO_WHATSAPP_URL ?? ""` (sem a variável a página mostra "grupo em breve" em vez de quebrar); composição conforme a estrutura da Fase 1. Sem layout próprio no grupo `(publico)`.
- `erp/ferramentas/otimizar-fotos-sorteio.mjs <pasta-origem>`: `import("sharp")` (existe em `erp/node_modules` como dependência transitiva do Next; se faltar, mensagem pedindo `npm i -D sharp`); para cada jpg/png/webp: `.rotate().resize(640, 640, { fit: "cover" }).webp({ quality: 78 })` para `public/sorteio/NN-slug.webp`; depois escreve `src/componentes/sorteio/fotos.ts`. Registrar em "Comandos" do `erp/CLAUDE.md`.
- `erp/.env.example`: `SORTEIO_WHATSAPP_URL=` com comentário. Definir em `.env.local` e na Vercel (Production e Preview).

Verificar: `npm run lint && npm run typecheck && npm run build`; `npm run dev`, abrir `/sorteio` deslogado (não pode redirecionar) e com cookie `fcs-tema=claro` (continua escura).

### Passo 4. Testes e docs da página pública (ponto de publicação)

- `erp/testes/integracao/sorteio.test.ts` (padrão de `ambiente.ts`; limpeza no `afterAll` por e-mail `teste-sorteio-<sufixo>%`): cria cliente e inscrição pela `admin().rpc`; repetição em 24 h devolve `repetida: true` e mantém uma linha; cliente existente só com telefone é reaproveitado e ganha o e-mail sem sobrescrever depois; `anonimo()` e usuário `dono` recebem `42501` ao chamar `inscrever_sorteio`; entradas inválidas levantam as chaves certas; perfil `leitura` lê `inscricoes_sorteio` mas não insere; `anonimo()` lê `[]`; `realizar_sorteio` com referência sintética (`1999-01`, nunca o mês real) recusa `leitura`, devolve ganhador para `dono` com `sorteado_por` correto, recusa segunda chamada e mês vazio.
- `erp/testes/integracao/rls.test.ts`: caso "anônimo e leitura não executam inscrever_sorteio; anônimo não lê inscricoes_sorteio" (regra de `docs/testes.md`).
- `erp/testes/e2e/sorteio.spec.ts` (produto ativo semeado pelo cliente de serviço, limpeza no fim): página abre sem login, preenche, escolhe Shopee e o produto, marca consentimento, envia, vê "Inscrição confirmada" e o link do WhatsApp (interceptar `chat.whatsapp.com` com `page.route` para o redirect não sair da página); envio vazio mostra os erros de nome e consentimento.
- Docs: `erp/docs/arquitetura.md` (exceção `acoes/publico` e `dados/publico`; `/sorteio` na lista livre; linha de ADR com data), `erp/docs/modelo-de-dados.md` (tabelas, view, função de telefone, as duas funções e os grants), `erp/docs/regras-de-negocio.md` (seção "Sorteio do panfleto": reuso por e-mail depois telefone, repetição em 24 h, nota no cliente, consentimento obrigatório, limites), `erp/docs/variaveis-de-ambiente.md` (`SORTEIO_WHATSAPP_URL`), spec seção 11 (endpoints e abuso incluem `/sorteio`), `erp/CLAUDE.md` (lista abaixo).

Verificar: `npm run test:integracao`, `npm run e2e`, depois o portão completo `npm run lint && npm run typecheck && npm test && npm run build`. Deploy pela `main` (ou merge da branch atual) e teste manual no celular.

### Passo 5. Tela interna `/vendas/sorteio`

- `erp/src/dados/vendas/sorteio.ts`: `listarInscricoes(referencia)` com joins `cliente:clientes(nome, email, telefone, anonimizado)`, `produto:produtos(nome)`, `canal:canais_venda(nome)`; `listarMesesSorteio()` pela view; `obterSorteio(referencia)`.
- `erp/src/acoes/vendas/sorteio.ts`: `realizarSorteio(referencia): Promise<ResultadoAcao>` com `exigirEscrita("vendas")` em try/catch (como `anonimizarCliente`), checagem de papel `dono`, `referenciaValida`, `clienteServidor().rpc("realizar_sorteio")`, `revalidatePath("/vendas/sorteio")`.
- `erp/src/app/(painel)/vendas/sorteio/page.tsx`: `exigirLeitura("vendas")`; `searchParams.referencia` só se válida, senão `referenciaAtual()`; cabeçalho, `FiltroMes`, contagem, cartão do ganhador quando houver, link `/vendas/sorteio/exportar?referencia=`, para `dono` o `BotaoAcao` com `realizarSorteio.bind(null, referencia)` e confirmação (nunca arrow inline), `TabelaInscricoes` ou `EstadoVazio`.
- `erp/src/componentes/vendas/Sorteio.tsx`: `FiltroMes` (`"use client"`, form GET com `SelectNativo` e `requestSubmit` no `onChange`), `TabelaInscricoes` (Table do shadcn; colunas nome, contato, produto, canal, aceita contato como `Badge`, origem, data), `CartaoGanhador`.
- `erp/src/app/(painel)/vendas/sorteio/exportar/route.ts`: cópia do handler de relatórios com `podeLer(usuario.papel, "vendas")`, `tabelaInscricoes`, `gerarCsv`, `nomeArquivo("sorteio-<referencia>", "csv", hojeSaoPaulo())`.
- `erp/src/componentes/painel/Icone.tsx`: `sorteio: Gift` (lucide). `erp/src/componentes/painel/navegacao.ts`: `FASE_ATUAL = 10` e item `{ rota: "/vendas/sorteio", rotulo: "Sorteio", icone: "sorteio", area: "vendas", fase: 10 }` sob Vendas; `sorteio: "Sorteio"` em `ROTULOS_SEGMENTO`.

### Passo 6. Testes e docs da tela interna

- `navegacao.test.ts`: "Sorteio" aparece sob Vendas para `leitura` na fase 10.
- `erp/testes/e2e/sorteio.spec.ts`: após `entrar(page)`, `/vendas/sorteio` mostra o título, a linha da inscrição do e2e, baixa o CSV (`waitForEvent("download")`, nome `sorteio-AAAA-MM-...csv`) e exibe o botão de sortear para o dono. Nunca clicar no botão no e2e (o banco de dev é o de produção; o sorteio é coberto pelo teste de integração).
- Opcional: incluir `/sorteio` e `/vendas/sorteio` em `responsivo.spec.ts`.
- Docs: `regras-de-negocio.md` (regra do sorteio: um por mês, aleatório entre quem aceitou contato e não foi anonimizado, `sorteado_por`), `testes.md` (linha sobre o e2e público).

Verificar: `npm test`, `npm run e2e`, portão completo e `npm run test:integracao`.

### Regras do `erp/CLAUDE.md` que o desenho toca

1. "`src/acoes/`: sempre `exigirEscrita`" e "service role só em `lib/supabase/admin.ts`": exceção deliberada em `acoes/publico/sorteio.ts` e `dados/publico/sorteio.ts`. Nova linha em "Regras de camadas": "Exceção única: `acoes/publico/` e `dados/publico/` servem a página pública `/sorteio` sem sessão; a escrita passa por limite por IP, honeypot, zod e `rpc` pela service role a `inscrever_sorteio`, executável só por `service_role`; a leitura é só id e nome de produtos ativos. Nada mais entra nessas pastas sem decisão registrada." Espelhar em `arquitetura.md` e na spec, seção 11.
2. Proxy manda deslogado para `/login`: `/sorteio` entra em `LIVRES`; anotar em `arquitetura.md`.
3. RLS, trigger `app.auditar()`, escrita em mais de uma tabela por função SQL, função rpc checando papel por dentro, caso em `rls.test.ts`, e2e para tela nova: todos atendidos acima.
4. "Nenhuma variável `NEXT_PUBLIC_*`": mantido; `SORTEIO_WHATSAPP_URL` é lida no servidor e passada como prop (é um link público).
5. "Comandos": acrescentar `node ferramentas/otimizar-fotos-sorteio.mjs <pasta>`.
6. "Áreas críticas": acrescentar "sorteio (`inscrever_sorteio` e `realizar_sorteio` em 0020)".

### Arquivos críticos

- `supabase/migrations/0020_sorteio.sql`
- `erp/src/lib/supabase/proxy.ts`
- `erp/src/dominio/sorteio/inscricao.ts`
- `erp/src/acoes/publico/sorteio.ts`
- `erp/src/app/(publico)/sorteio/page.tsx`
- `erp/src/componentes/sorteio/FormSorteio.tsx`
- `erp/src/app/(painel)/vendas/sorteio/page.tsx`
- `erp/testes/integracao/sorteio.test.ts`, `erp/testes/e2e/sorteio.spec.ts`
- `marketing/panfleto-sorteio/{panfleto.html,render.mjs,qr.svg,texto.md}`

---

## Verificação de ponta a ponta

1. ERP: `npm run lint && npm run typecheck && npm test && npm run build`; `npm run test:integracao` (migração, RLS, função de inscrição e de sorteio); `npm run e2e` (fluxo público e tela interna).
2. Migração aplicada em dev e teste com `npm run migrar -- --alvo dev` e `--alvo teste`, depois `npm run tipos`.
3. Manual, em janela anônima no celular: abrir `https://fcs-erp.vercel.app/sorteio?via=panfleto` sem login, preencher, conferir sucesso e o redirect para o grupo; no ERP, conferir o cliente em Vendas > Clientes e a inscrição em Vendas > Sorteio; repetir o envio e confirmar que não duplica.
4. Segurança: confirmar que `/sorteio` continua acessível sem sessão e que `/vendas/*` continua exigindo login; `anon` não lê `inscricoes_sorteio` nem `sorteios` (caso novo em `rls.test.ts`); 6 envios seguidos do mesmo IP recebem "muitas tentativas".
5. Panfleto: abrir `panfleto.pdf`, conferir 2 páginas de 106x156 mm; escanear o QR do `verso.png` na tela e na prova impressa em casa com dois celulares; o link deve abrir a página com `?via=panfleto`.
6. Lighthouse mobile da página pública acima de 90 em desempenho e acessibilidade.
