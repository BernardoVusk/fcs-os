# Estudo: Ziem Spy (referência pro FCS SPY)

Data: 27/09/2026
Fonte: landing https://ziemspy-pi.vercel.app/ (bundle JS lido direto) e prints do painel enviados pelo Bernardo.

## O que é

Extensão de Chrome que roda em cima da busca da Shopee (`shopee.com.br/search?keyword=...`) e injeta métricas em cada card de produto. Não é site separado: o usuário pesquisa na Shopee normal e os dados aparecem no próprio card.

Preço de venda deles: R$ 47/mês ou R$ 197/ano, pagamento via Cakto, garantia de 7 dias.

## Funções

1. **Card enriquecido**: dias no ar, preço de venda, quanto o vendedor recebe, vendas 30 dias, vendas totais, faturamento 30 dias, faturamento total, média diária, custo alvo por margem, likes, reviews, selos (Relâmpago, Indicado, Ads), número de variações, nome da loja com botão copiar.
2. **Ordenação**: reordena os resultados da página por Unidades Mês, Unidades Total, Faturamento 30D, Data de Criação (asc e desc).
3. **Calculadora de margem**: custo do produto, custo operacional por pedido, impostos %, kits, preço de venda, Pix, cupom frete grátis, Shopee Ads com ROAS esperado. Devolve lucro líquido, margem líquida, ROAS mínimo (break even) e taxa Shopee.
4. **Raio-X de variações**: estoque, vendas e receita estimada por variação (cor, modelo).

## Engenharia reversa das contas (conferida com os prints)

Card 1 do print: preço R$ 9,90, 390 dias no ar, 1.151 vendas 30D, 4.595 vendas totais.

| Campo | Fórmula | Conferência |
|---|---|---|
| Recebe | preço x 0,80 menos R$ 4 | 9,90 x 0,8 = 7,92 menos 4 = **3,92** |
| Faturamento 30D | vendas 30D x preço | 1.151 x 9,90 = **11.394,90** |
| Faturamento total | vendas totais x preço | 4.595 x 9,90 = **45.490,50** |
| Média diária | faturamento 30D / 30 | 11.394,90 / 30 = **379,83** |
| Custo alvo 10% | recebe menos 10% do preço | 3,92 menos 0,99 = **2,93** |
| Custo alvo 15% | recebe menos 15% do preço | 3,92 menos 1,485 = **2,43** |
| Dias no ar | hoje menos data de criação do anúncio | |

Conferido também nos cards de R$ 15,83 (recebe 8,66) e R$ 21,99 (recebe 13,59).

Calculadora (print): preço 15,90, taxa Shopee **7,18** = 15,90 x 20% + R$ 4. Imposto 4% = 0,64. Ads com ROAS 30 = 15,90 / 30 = 0,53.

Pontos de atenção:
- Faturamento usa o preço atual pra todo o histórico. Se o preço mudou, o número distorce. É estimativa, não dado.
- Taxa de 20% + R$ 4 fica fixa no código. A regra de comissão da Shopee muda (programa de frete, faixa de preço, CNPJ ou CPF). No FCS SPY isso tem que ser configurável.

## Raio-X de variações é chute

O próprio popup deles admite: assume que todas as variações começaram com o mesmo estoque (o maior estoque atual) e distribui as vendas do anúncio na proporção do estoque consumido. Serve pra ranquear variação, não pra contar venda.

## De onde vêm os dados (hipótese técnica)

Tudo que o card mostra existe na resposta JSON que a própria Shopee manda pro browser quando a busca carrega (`/api/v4/search/search_items`) e quando o anúncio abre (`/api/v4/pdp/get_pc` ou equivalente). Campos esperados:

- `price` (dividido por 100000), `sold` (vendas 30 dias), `historical_sold`, `ctime` (criação), `liked_count`, `cmt_count`, `item_rating`, `stock`, `models[]` (variações com preço e estoque), `shop_name`, `shopid`, `itemid`, flags de anúncio pago, flash sale e vendedor indicado.

Como a Shopee bloqueia chamada de fora (testado em 21/08/2026), a extensão não chama a API. Ela **escuta** as respostas que a página já recebe, interceptando `fetch` e `XMLHttpRequest` dentro da aba. Isso dispensa token e assinatura anti-bot, porque quem faz a requisição é a própria Shopee.

**A confirmar antes de codar**: nomes exatos dos endpoints e campos em 2026. Isso sai de uma captura real (DevTools, aba Network, salvar como HAR) feita no browser logado.

## O que preciso pra fazer igual

1. Uma captura HAR de uma busca na Shopee e de uma página de produto, feita no Chrome logado.
2. Regra de comissão Shopee atual da conta FCS (percentual e taxa fixa).
3. Decisão de escopo: uso interno ou produto pra vender.
