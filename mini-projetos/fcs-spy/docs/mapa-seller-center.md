# Mapa do Seller Center (fase 3)

Data: 02/10/2026
Fonte: conta da FCS logada em `seller.shopee.com.br`, lida pelo Chrome conectado. Só leitura: nenhum preço, campanha ou anúncio foi alterado.
Amostras: `extensao/testes/amostras/vendedor/seller-center-2026-10-02.json` (nomes de produto trocados por "Produto N", imagens e parâmetros de sessão removidos).

## Regras gerais

- Todas as respostas úteis passam por `seller.shopee.com.br/api/...` e chegam por `fetch` ou XHR da própria página. A mesma técnica de escuta da v1 funciona aqui.
- Todo endereço leva `SPC_CDS` e `SPC_CDS_VER`, que são parâmetros de sessão. **Nunca guardar nem registrar esses dois.**
- Períodos usam `start_time` e `end_time` em segundos Unix e `period` (visto: `real_time`, que é "hoje até agora"). Outros valores de `period` aparecem quando você troca o período na tela; confirmar na fase 4.
- **Escala de dinheiro muda conforme o painel**:
  - `/api/mydata/...` (Dados): reais direto. `paid_gmv: 115.26` é R$ 115,26.
  - `/api/pas/...` (Shopee Ads): multiplicado por 100.000. `broad_gmv: 11526000` é R$ 115,26; `daily_budget: 7000000` é R$ 70,00; `roi_two_target: 1600000` é ROAS alvo 16,0.
  - Afiliados: valores em reais e também uma versão em texto (`dis_*`).
- Taxas vêm em fração: `ctr: 0.0197` é 1,97%.
- Duas partes do Seller Center são aplicativos separados (Dados e Ads de um lado, Afiliados de outro). Trocar entre eles recarrega a página; dentro de cada um a navegação é interna. A extensão entra no carregamento de cada página, então isso não a atrapalha.
- **A escuta do vendedor tem que trabalhar com lista fechada de endpoints.** Uma escuta genérica pega também `/api/v2/login/` e outras respostas com dado de conta; essas nunca podem ser gravadas.

## Dados do Negócio (Informações Gerenciais)

| Uso | Endpoint | Campos principais |
|---|---|---|
| Início: números do período | `/api/mydata/v3/dashboard/key-metrics/` | `paid_gmv`, `paid_orders`, `paid_sales_per_order`, `shop_uv` (visitantes), `shop_pv`, `product_clicks`, `shop_uv_to_paid_buyers_rate` (conversão). Cada um com `value`, `chain_ratio` (variação contra o período anterior, fração) e `points` (série por hora/dia) |
| Início: de onde vem cada venda | `/api/mydata/v1/dashboard/traffic-sources/` | `overview`: `total_sales`, e por canal (`product_card`, `live`, `video`, `affiliate`, `paid_ads`) o valor, `_pct_diff` e `_ratio`. Blocos por canal com vendas, pedidos, cliques, CTR e conversão |
| Início: produtos por canal | `/api/mydata/v1/dashboard/traffic-sources/product-contribution/` | por produto: `id`, `sales`, `orders`, `product_clicks`, `product_impressions`, `ctr`, `product_clicks_to_orders_rate`, `is_boost_with_ads`, `campaign_id`, e `_pct_diff` de cada um. Parâmetro `l1_source` escolhe o canal |
| Início: ranking | `/api/mydata/v3/dashboard/product-rankings/` | mesmo formato de produto da Performance (abaixo), 5 itens |
| Tempo real | `/api/mydata/v2/campaign_board/realtime_metrics/` | `key_metrics` (uv, pedidos, vendas, conversão), `top_sales_items`, `sales_hourly` |
| Produto: visão geral | `/api/mydata/v2/product/overview/` | totais da loja: `uv`, `pv`, `bounce_rate`, `search_clicks`, `atc_uv`, `atc_rate`, `paid_buyers`, `paid_gmv`, `paid_order`, `uv_to_paid_buyers_rate` |
| **Funil de Produto** | `/api/mydata/v4/product/performance/` | por produto (`items[]`), ver tabela abaixo. Paginado: `page_size` (a tela usa 10), `page_num`, `order_by` (ex.: `paid_sales.desc`), `total` |
| Marketing: ferramentas | `/api/mydata/marketing/<ferramenta>/key-metrics/` | visto `new-discount` (Descontos): `sales`, `orders`, `units`, `buyers`, `sales_per_buyer`, cada um com `_pct_diff`, e `time_series`. Parâmetro `promotion_type`. Cupons, combos e demais ferramentas seguem o mesmo padrão em outras abas de Marketing (confirmar na fase 4) |

### Produto em `/v4/product/performance/` (campos do funil)

| Etapa ou métrica | Campo |
|---|---|
| Id do produto (igual ao `itemid` do lado comprador) | `id` |
| Impressões do card | `product_card_impressions` (e `unique_product_card_impressions`) |
| Cliques no card | `product_card_clicks` (e `unique_product_card_clicks`) |
| CTR | `ctr` |
| Visitantes da página | `uv` (e `pv`) |
| Rejeição | `bounce_visitors`, `bounce_rate` |
| Cliques vindos da busca | `search_clicks` |
| Carrinho | `add_to_cart_units`, `add_to_cart_buyers`, `uv_to_add_to_cart_rate` |
| Pedidos pagos | `paid_orders`, `paid_units`, `paid_buyers`, `paid_sales` |
| Conversão | `paid_order_conversion_rate`, `uv_to_paid_buyers_rate` |
| Também | `placed_*` (feitos) e `confirmed_*` (confirmados), `likes`, recompra (`repeat_*`) |
| Por variação | `models[]`: `id`, `name`, `add_to_cart_units`, `paid_sales`, `paid_units`, `paid_buyers` e taxas. É o raio-x de variações da própria loja |

## Shopee Ads

| Uso | Endpoint | Campos principais |
|---|---|---|
| **Campanhas** | `/api/pas/v1/homepage/query/` (POST) | `entry_list[]`: `type` (`product_manual` etc.), `state` (`ongoing`, `paused`, `ended`, `closed`), `title`, `manual_product_ads.item_id` (liga a campanha ao produto), `campaign`: `campaign_id`, `daily_budget`, `total_budget`, `roi_two_target` (ROAS alvo), `start_time`, `end_time`. `report`: `cost`, `impression`, `click`, `ctr`, `cpc` (custo por pedido, igual a `cost / broad_order`, 0 sem pedido; não é custo por clique), `cpdc` (custo por pedido direto), `broad_gmv`, `broad_order`, `broad_roi` (ROAS amplo), `direct_gmv`, `direct_order`, `direct_roi`, `atc`, `avg_rank`, `cpm` (não confirmado, não usado). `ratio`: variação de cada métrica |
| Resumo do período | `/api/pas/v1/report/get_time_graph/` | `report_aggregate` (mesmas métricas somadas) e `report_by_time` (série) |
| Saldo | `/api/pas/v1/wallet/get/` | `ads_credit`, `ads_expense_today` |
| Orçamento estourando | `/api/pas/v1/todo/daily_budget/check_campaign_list/` | lista de campanhas perto do teto diário (útil para "cabe mais investimento") |
| Sugestões da Shopee | `/api/pas/v1/diagnosis/get_suggestion/`, `/api/pas/v1/diagnosis/homepage_batch_list_verdict/` | veredito da própria Shopee por campanha (comparar com o nosso) |

Na conta da FCS em 02/10/2026: 15 campanhas, todas de produto manual (5 ativas, 1 pausada, o resto encerrada).

## Afiliados

| Uso | Endpoint | Campos principais |
|---|---|---|
| Indicadores do período | `/api/v3/affiliateplatform/dashboard/seller_daily` | `list[]` por dia (`ymd`, `actual_amount`, `order_count`, `seller_gross_commission`, `roi`, `gross_item_sold`, `total_buyers`, `new_buyers`, `clicks`) e totais (`total_actual_amount`, `total_order_count`, `total_seller_commission`, `total_roi`, com `_diff` e `_ratio`). Parâmetros: `start_time`, `end_time`, `is_real_time`, `order_type`, `channel` (0 = todos) |

## O que isso destrava para as fases 4 a 7

- **Funil de Produto (fase 5)**: tudo vem num endpoint só, por produto, com o `id` igual ao do lado comprador. Dá para cruzar com o custo cadastrado do produto.
- **Shopee Ads (fase 6)**: ROAS real (`broad_roi`), gasto, pedidos e orçamento por campanha, e o `item_id` para buscar o custo e calcular o ROAS de equilíbrio. A Shopee já usa o termo "ROAS alvo" (`roi_two_target`); o veredito pode mostrar os três: real, alvo da campanha e equilíbrio do produto.
- **Início (fase 5)**: key-metrics + traffic-sources cobrem números do período, comparação e origem das vendas.
- **Marketing e Afiliados (fase 7)**: endpoints confirmados para Descontos e Afiliados; demais ferramentas de Marketing seguem o mesmo padrão e serão confirmadas quando a coleta passiva existir.

## Limites desta descoberta

- Período visto só em "tempo real" (hoje). Os campos com período de 7 ou 30 dias devem ser os mesmos, com outro `period`; confirmar na fase 4.
- A coleta passiva só vê o que a tela pede: a Performance do Produto pede 10 por página. Para ler o catálogo inteiro, a tela precisa estar com mais itens por página ou a extensão vai juntando as páginas que você abrir.
- O corpo do POST de `homepage/query` não foi lido (só a resposta).

## Lado comprador, achado da mesma sessão

- Página inicial (Descobertas do dia): 30 produtos ganharam o painel, com as cores certas. 18 ficaram sem; nesses o card da Shopee é um `div`, sem `<li>`. Causa ainda não confirmada (formato da resposta ou lugar de encaixe).
- Ao recarregar a página inicial e rolar rápido sob automação, a Shopee pediu verificação de robô (`scene=crawler_item`). A suspeita é a automação, não a extensão. Repetir essa checagem com navegação manual.
