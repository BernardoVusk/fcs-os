# FCS SPY: design da versão 1

Data: 27/09/2026
Status: aprovado em conversa, aguardando revisão da spec escrita
Referência: `../estudo-ziem-spy.md`

## Objetivo

Extensão de Chrome para estudar mercado e produto na Shopee Brasil. Ela mostra, dentro da busca normal da Shopee, quanto cada anúncio vende e fatura, e se aquele produto dá lucro sendo impresso em 3D pela FCS.

Uso interno agora, pela conta FCS, instalada em modo desenvolvedor. Arquitetura preparada para virar produto vendável depois, sem reescrever.

## Escopo

**Entra na versão 1**
1. Card enriquecido em cada produto da página de busca
2. Ordenação dos resultados carregados
3. Calculadora de lucro com custo de impressão 3D
4. Histórico por anúncio, com tendência entre leituras
5. Tela de configurações

**Fica para depois**
- Raio-X de variações (estoque e vendas estimadas por cor/modelo)
- Salvar lista e exportar CSV para `pesquisa/`
- Login, licença, pagamento, publicação na Chrome Web Store
- Mercado Livre e TikTok Shop

## Como os dados chegam

A extensão não faz requisição nenhuma à Shopee. Ela escuta as respostas JSON que a própria página da Shopee recebe.

Motivo: a Shopee bloqueia chamada externa (403 testado em 21/08/2026) e exige assinaturas anti-bot geradas pelo código dela. Escutar a resposta que a página já recebeu dispensa tudo isso.

Mecânica:
- Um script injetado no contexto da página (`world: "MAIN"`, `run_at: document_start`) envolve `window.fetch` e `XMLHttpRequest`. Quando a URL bate com os endpoints de busca ou de produto, clona a resposta e envia o JSON via `window.postMessage`.
- O content script (contexto isolado da extensão) recebe a mensagem e passa adiante.
- A resposta original segue intacta para a Shopee. A escuta nunca altera nem atrasa a requisição.

Endpoints confirmados pela captura HAR de 27/09/2026 (busca "miniatura f1", logado):
- Busca: `/api/v4/search/search_items` (60 itens por chamada, paginação por `newest`)
- Produto: `/api/v4/pdp/get_pc`
- Vitrine "mais vendidos" da página de produto: `/api/v4/pdp/hot_sales/get_item_cards`

A busca e a vitrine usam o mesmo formato de card (`item_data` + `item_card_displayed_asset`). A Tradução trata os dois com a mesma função. `item_basic`, o formato antigo, vem sempre `null` em 2026.

Amostras limpas (sem cookie, endereço ou dados da conta) em `extensao/testes/amostras/`. O HAR original fica fora do git (`*.har` no `.gitignore`).

## Mapa de campos (confirmado)

Formato de card (busca e vitrine), por item:

| Campo nosso | Caminho na resposta |
|---|---|
| itemId, shopId | `item_data.itemid`, `item_data.shopid` |
| titulo | `item_card_displayed_asset.name` |
| loja | `item_data.shop_data.shop_name` |
| preco | `item_data.item_card_display_price.price` / 100000 |
| vendas30d | `item_data.item_card_display_sold_count.monthly_sold_count` (é o "Vendido/Mês" da tela) |
| vendasTotal | `item_data.item_card_display_sold_count.historical_sold_count` |
| criadoEm | `item_data.ctime` (segundos Unix) |
| likes | `item_data.liked_count` |
| reviews | `item_data.item_rating.rating_count[0]` |
| nota | `item_data.item_rating.rating_star` |
| indicado | `item_card_displayed_asset.seller_flag.name` igual a `PREFERRED` |
| lojaOficial | `item_card_displayed_asset.seller_flag.name` igual a `OFFICIAL_SHOP` |
| ads | `search_item_tracking` (JSON em texto) campo `is_ads` |

Página de produto (`pdp/get_pc`), usada só para variações:
- `data.item.tier_variations[].options` (nomes) e `data.item.models[]` (preço por variação)
- Não traz vendas nem estoque em número: `stock`, `models[].stock` e `models[].sold` vêm `null`, e `historical_sold` vem só como texto arredondado ("1mil+").

Descobertas que mudam o desenho:
- **Estoque não existe nas respostas.** Sai do tipo `Anuncio`. O raio-X de variações do Ziem depende de outra técnica, fica para a versão 2 e precisa de estudo próprio.
- **Preço do card é o menor preço com promoção.** No anúncio da amostra, o card mostra R$ 17,90, mas as variações vão até R$ 54,90. Faturamento calculado com esse preço é piso, não média. O card deixa isso explícito.
- **Ads não confirmado.** A busca capturada veio com `total_ads_count: 0`. O campo `is_ads` existe, mas falta uma amostra com anúncio pago. O texto "Ad" em `icon_in_image.ads_text` aparece em todo item e não serve como sinal.
- **Relâmpago sem campo identificado.** `item_card_display_price.promotion_type` varia (301, 312, 324, 202), mas não dá para cravar qual é relâmpago com uma amostra. Selo relâmpago sai da versão 1.

## Unidades

Cada unidade tem uma função e pode ser testada isolada.

| Unidade | Arquivo | Faz | Depende de |
|---|---|---|---|
| Escuta | `src/page/escuta.ts` | Intercepta fetch/XHR na página e publica o JSON bruto | nada |
| Ponte | `src/content/ponte.ts` | Recebe o postMessage, valida origem, entrega ao content script | Escuta |
| Tradução | `src/shopee/traduzir.ts` | Converte JSON da Shopee no tipo `Anuncio` | nada (função pura) |
| Métricas | `src/nucleo/metricas.ts` | Contas do card | Configurações (valores, não armazenamento) |
| Calculadora | `src/nucleo/calculadora.ts` | Contas de lucro com impressão 3D | idem |
| Histórico | `src/dados/historico.ts` | Grava e lê leituras em `chrome.storage.local` | nada |
| Configurações | `src/dados/config.ts` + `src/opcoes/` | Lê e grava em `chrome.storage.local`, tela de opções | nada |
| Card | `src/ui/card.ts` | Desenha o painel sob cada produto | Métricas, Histórico |
| Ordenação | `src/ui/ordenar.ts` | Botão e reordenação dos cards carregados | Tradução |
| Painel calculadora | `src/ui/painel.ts` | Painel lateral da calculadora | Calculadora |
| Licença | `src/licenca/` | Vazio na v1. Ponto único onde login e licença entram depois | nada |

A Tradução é o único arquivo que muda quando a Shopee mudar o formato da resposta.

## Tipo `Anuncio`

```ts
type Anuncio = {
  itemId: string
  shopId: string
  titulo: string
  loja: string | null
  preco: number            // em reais
  vendas30d: number | null
  vendasTotal: number | null
  criadoEm: Date | null
  likes: number | null
  reviews: number | null
  nota: number | null
  selos: { ads: boolean | null; indicado: boolean; lojaOficial: boolean }
}
```

`ads` é `null` enquanto o sinal não for confirmado com uma amostra de anúncio pago.

Variações ficam num tipo separado, preenchido só quando a página do produto abre:

```ts
type Variacoes = { itemId: string; opcoes: { nome: string; preco: number }[] }
```

Campo ausente na resposta vira `null` e aparece como "sem dado" na tela, nunca como zero.

Preço da Shopee vem inteiro multiplicado por 100000. A Tradução divide.

## Métricas do card

Comissão configurável: `comissaoPct` (padrão 20%) e `taxaFixa` (padrão R$ 4,00). Os padrões vêm do Ziem Spy e precisam ser confirmados com a regra atual da conta FCS.

| Métrica | Fórmula | Marcação |
|---|---|---|
| Dias no ar | hoje menos `criadoEm`, em dias inteiros | |
| Recebe | preço menos (preço x comissaoPct + taxaFixa) | |
| Faturamento 30D | vendas30d x preço | estimativa |
| Faturamento total | vendasTotal x preço | estimativa |
| Média diária | faturamento 30D / 30 | estimativa |
| Custo alvo por margem | recebe menos (margem x preço), margens padrão 10%, 15%, 20% | |

"Estimativa" aparece com marcação visual discreta no card, porque o faturamento usa o menor preço atual para todo o período e para todas as variações.

Na página de produto, o topo do painel da calculadora mostra os números guardados no Histórico da última vez que o anúncio apareceu numa busca ou vitrine, com a data da leitura. Se nunca apareceu, mostra "abra pela busca para ver vendas".

O card é localizado pelo link do produto, que segue o padrão `-i.<shopId>.<itemId>` (confirmado na captura).

Se qualquer entrada da fórmula for `null`, o resultado é `null`.

Conferência obrigatória nos testes (valores do print do Ziem): preço 9,90, vendas30d 1.151, vendasTotal 4.595 resulta em recebe 3,92, faturamento 30D 11.394,90, faturamento total 45.490,50, média diária 379,83, custo alvo 10% 2,93.

## Calculadora 3D

Configurações fixas (tela de opções):
- Preço do filamento por kg (R$)
- Perda de filamento (%, suportes e falhas)
- Potência média da impressora (W) e preço do kWh (R$)
- Desgaste da máquina por hora (R$)
- Mão de obra de acabamento por hora (R$)
- Embalagem por pedido (R$)
- Imposto (%)
- Comissão Shopee (% e taxa fixa)

Entradas por produto (painel):
- Preço de venda (preenchido com o preço do anúncio aberto, editável)
- Gramas de filamento
- Horas de impressão
- Minutos de acabamento
- Shopee Ads ligado ou não, e ROAS esperado

Contas:
- Filamento = gramas x (preço kg / 1000) x (1 + perda)
- Energia = horas x (potência / 1000) x preço kWh
- Desgaste = horas x desgaste por hora
- Acabamento = (minutos / 60) x mão de obra por hora
- Custo de produção = filamento + energia + desgaste + acabamento + embalagem
- Taxa Shopee = preço x comissaoPct + taxaFixa
- Imposto = preço x impostoPct
- Ads = preço / ROAS, se ligado
- Lucro = preço menos taxa, imposto, ads e custo de produção
- Margem = lucro / preço
- ROAS mínimo = preço / (preço menos taxa, imposto e custo de produção). Se o denominador for zero ou negativo, mostra "prejuízo mesmo sem ads".

Conferência obrigatória (valores do print do Ziem, com filamento, energia, desgaste e acabamento somando 4,80, embalagem 0,20, logo custo de produção 5,00, imposto 4%, comissão 20% + 4): preço 15,90 dá taxa 7,18, imposto 0,64 e ROAS mínimo 5,16.

## Histórico

- Armazenamento: `chrome.storage.local`, chave `h:<itemId>` com a lista de leituras do anúncio, permissão `unlimitedStorage`. Não usar IndexedDB: dentro do content script ele pertence à origem shopee.com.br, onde a Shopee pode ler e apagar.
- Leitura: `{ itemId, data, preco, vendas30d, vendasTotal }`, com `data` no formato `AAAA-MM-DD` local.
- Uma leitura por anúncio por dia. Se o anúncio aparecer de novo no mesmo dia, a leitura do dia é substituída. Guarda no máximo 90 leituras por anúncio.
- Uma resposta de busca vira uma leitura em lote: um `get` e um `set` para os 60 itens.
- O card compara com a leitura anterior mais recente de outro dia e mostra: diferença de vendas 30D, diferença de preço, dias desde a última leitura, seta subindo/caindo/estável.
- Sem leitura anterior: o card mostra "primeira leitura".

## Ordenação

Botão acima dos resultados com as opções: vendas 30D, vendas total, faturamento 30D, mais novos, mais antigos. Sempre em ordem decrescente, menos as de data.

Reordena só os cards já carregados na página. Anúncio sem o dado vai para o fim. Deixar isso escrito no próprio botão ("ordena os itens desta página").

## Visual

Segue `identidade/design-guide.md`: fundo preto, destaque ciano, sem emoji, sem travessão. O card fica embaixo do card original da Shopee, sem esconder nada dele. Um botão liga e desliga a camada FCS SPY.

## Erros

- Resposta com formato inesperado: a Tradução devolve lista vazia e registra no console com o prefixo `[FCS SPY]`. O card não aparece. A Shopee continua funcionando.
- Card sem correspondência na resposta (por exemplo, anúncio injetado depois): fica sem painel.
- Armazenamento indisponível: card funciona sem histórico, mostrando "histórico indisponível".
- A escuta está envolvida em try/catch. Nenhum erro dela pode quebrar a página da Shopee.

## Testes

- Tradução: testada com respostas reais salvas da captura HAR em `testes/amostras/`.
- Métricas e Calculadora: testadas com os valores de conferência acima, incluindo casos com `null`.
- Histórico: substituição no mesmo dia, comparação com o dia anterior, primeira leitura.
- Card, ordenação e painel: validados à mão no Chrome logado, com um roteiro de checagem em `docs/checagem-manual.md`.

## Stack

- Manifest V3
- TypeScript, build com esbuild (um bundle por ponto de entrada: escuta, content, opções)
- Testes com Vitest
- Sem framework de UI. DOM direto, com Shadow DOM no card e no painel para o CSS da Shopee não interferir.

## Pastas

```
mini-projetos/
  fcs-spy/
    estudo-ziem-spy.md
    docs/
    extensao/
      manifest.json
      src/
      testes/
        amostras/
      dist/        (gerado pelo build, carregado no Chrome)
```

## Pré-requisitos para começar a codar

1. Captura HAR: feita em 27/09/2026, amostras extraídas.
2. Comissão Shopee: padrão 20% + R$ 4 aceito, editável nas opções.
3. Custos de impressão: padrões editáveis, valores reais entram depois.

Pendente, sem bloquear: uma captura de busca que tenha anúncio pago, para confirmar o sinal de ads.

## Riscos

- **Termos da Shopee**: escutar dados que o próprio usuário carregou é baixo risco para uso interno. Vender a ferramenta aumenta a exposição. Avaliar antes da fase de venda.
- **Mudança de formato**: a Shopee pode renomear campos. Mitigação: tudo concentrado na Tradução, com amostras reais nos testes.
- **Significado de vendas 30D**: confirmado. `monthly_sold_count` vem junto do texto "N Vendido/Mês" que a própria Shopee exibe.
