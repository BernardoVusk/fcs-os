# FCS SPY v3: cobertura geral, cores de venda e módulo Vendedor

Data: 02/10/2026
Status: decisões tomadas pelo usuário em conversa; aguarda revisão desta spec
Referências: `../estudo-seller-ia-club.md` (landing e vídeo de demonstração), `2026-09-27-fcs-spy-design.md` (v1), `2026-09-27-fcs-spy-v2-visual-design.md` (visual)

## Objetivo

Três frentes novas:

1. **Cobertura geral**: o card do FCS SPY aparece em todo produto que a Shopee mostrar, em qualquer página do comprador, não só na busca.
2. **Cor das vendas 30D**: verde para muito, amarelo para médio, vermelho para pouco.
3. **Módulo Vendedor**: painel dentro do Seller Center que lê a conta da FCS e diz o que fazer, inspirado no Seller.IA Club.

## Decisões já tomadas

| Pergunta | Decisão |
|---|---|
| Como definir muito, médio e pouco | Números fixos, editáveis na tela de custos. Padrão: verde a partir de 300 vendas/mês, amarelo de 50 a 299, vermelho abaixo de 50 |
| Quem escreve os diagnósticos do Seller Center | Regras fixas na extensão. Sem IA, sem custo por uso, funciona offline. Interpretação longa continua no `/marketplace` com o Claude |
| Abas do Seller Center na primeira leva | Início, Funil de Produto, Shopee Ads, Relatório, Marketing e Afiliados |

## Decomposição em fases

O todo é grande demais para um plano só. Cada fase tem seu plano e sua revisão.

| Fase | Entrega | Depende de | Plano |
|---|---|---|---|
| 1 | Cores das vendas 30D | nada | `2026-10-02-fcs-spy-v3-fase1-plano.md` |
| 2 | Cobertura geral no lado comprador | 1 | mesmo plano da fase 1 |
| 3 | Descoberta do Seller Center (mapa de campos e amostras) | nada | roteiro nesta spec |
| 4 | Moldura do painel Vendedor, coleta passiva, custo por produto | 3 | escrito depois da fase 3 |
| 5 | Início e Funil de Produto | 4 | escrito depois da fase 3 |
| 6 | Shopee Ads | 4, custo por produto | escrito depois da fase 3 |
| 7 | Marketing, Afiliados e Relatório | 4 | escrito depois da fase 3 |

Os planos das fases 4 a 7 só podem ser escritos com código exato depois de ver como o Seller Center responde. Escrever antes seria inventar formato.

---

## Frente 1: cor das vendas 30D

### Regra

`faixaVendas(vendas30d, config)`:
- `vendas30d === null` → sem faixa (card neutro, como hoje)
- `vendas30d >= corteVerde` → `alta`
- `vendas30d >= corteAmarelo` → `media`
- senão → `baixa`

`corteVerde` padrão 300, `corteAmarelo` padrão 50. Se o usuário salvar `corteAmarelo >= corteVerde`, a mescla mantém os padrões dos dois (evita faixa impossível).

### Visual

- O número grande de Vendas 30D fica na cor da faixa. Tons escolhidos para contraste de texto sobre branco: verde `#15803D`, amarelo `#A16207`, vermelho `#B91C1C`.
- Faixa de 4px na borda esquerda do card, tons vivos: `#22C55E`, `#EAB308`, `#EF4444`.
- `title` no número: "Vendas altas: 300 ou mais no mês" (com os cortes reais).
- Mesma cor no número de Vendas 30D do resumo da calculadora.
- Exceção ao design guide (cores quentes): pedida pelo usuário, só na extensão, só para estado de vendas.

### Configuração

Grupo novo na tela Seus custos: "Cores das vendas", campos "Verde a partir de" e "Amarelo a partir de", sufixo "/mês".

---

## Frente 2: cobertura geral

### Onde aparece

Toda página do comprador com card de produto: página inicial (Descobertas do dia), categoria, loja, busca (todas as ordenações), página de produto (similares, da mesma loja, mais vendidos), ofertas relâmpago. Critério: se a resposta da Shopee traz o produto com vendas, o card aparece.

### Como

- **Escuta**: hoje filtra 3 URLs. Passa a olhar toda resposta JSON de `shopee.com.br/api/`. Antes de publicar, um teste barato no texto: só publica se contém `"item_card_display_sold_count"`, `"item_basic"` ou `"historical_sold"`. Respostas de rastreamento, carrinho e notificação são descartadas sem `JSON.parse`. Continua sem alterar nem atrasar nada.
- **Rota**: `produto` continua para `pdp/get_pc` (variações). Todo o resto vira rota `cards`.
- **Tradução**: `acharCards(json)` percorre o JSON (profundidade máxima 12, até 5.000 nós) e traduz cada objeto que tiver a forma de card. Duas formas:
  - card 2026 (`item_data` + `item_card_displayed_asset`), já suportada;
  - `item_basic` (formato antigo, que pode ainda aparecer fora da busca), a confirmar com amostra.
  Duplicados pelo mesmo `itemId` ficam com a primeira ocorrência.
- **Desenho**: `mapaDeLinks` já varre o documento todo. O ponto incerto é o container: na busca é o `<li>`; nas outras páginas pode não haver `<li>`. Cada tipo de página é conferido no Chrome antes de dar por pronta.

### Risco e checagem

- Páginas com carrossel (Descobertas, similares) podem ter card estreito ou com altura fixa. Se o painel não couber, a saída é um modo compacto (só Vendas 30D com a cor e o chip), definido na checagem e não antes.
- Volume: a página inicial carrega dezenas de respostas. O teste de texto antes do parse é obrigatório.

---

## Frente 3: módulo Vendedor (Seller Center)

### Onde roda

`seller.shopee.com.br`, conta da FCS logada. Bundle separado (`vendedor.js`) para não pesar no lado comprador. Escuta própria no mundo da página, mesma técnica da v1.

### Moldura (fase 4)

- Painel lateral branco à direita (420px), visual v2, abre e fecha por um botão flutuante com a marca FCS na borda da tela.
- Cabeçalho: nome da loja, "N campanhas · N produtos · lido há X min".
- Abas: Início, Funil, Ads, Marketing, Afiliados, Relatório. Precificação e custos ficam na calculadora e na tela Seus custos que já existem.
- Cartão padrão: título-veredito em linguagem simples, faixa de números grandes, uma frase explicando, ações com seta. Cor do cartão pelo estado: vermelho (perdendo dinheiro), amarelo (dá para melhorar), verde (indo bem). Mesma paleta de estado da frente 1.

### Coleta passiva

- A extensão grava as respostas do Seller Center enquanto você navega pelas páginas dele: Dados do Negócio, Produtos, Shopee Ads, Marketing, Afiliados.
- Cada seção mostra quando foi lida. Seção sem dado mostra "abra Dados do Negócio > Produtos no período que quer analisar" com o link, nunca número inventado.
- Guardado em `chrome.storage.local`, chave por tipo e período. Nada sai do navegador.
- Coleta ativa (botão "Recoletar", repetindo as chamadas da página) fica para depois, se a fase 3 mostrar que é seguro.
- **Proibido capturar pedidos individuais**: endpoints de pedido trazem nome e endereço de comprador. Só dados agregados.

### Custo por produto

Os vereditos de dinheiro precisam do custo de cada produto. Novo registro `custo:<itemId>` com gramas, horas e minutos de acabamento (os demais custos vêm da configuração). Preenchido de dois jeitos:
- botão "Salvar como custo deste produto" no painel da calculadora (lado comprador, na página do próprio produto);
- campo "Cadastrar custo" no cartão do produto no Funil.

Sem custo cadastrado, o veredito de dinheiro mostra "cadastre o custo" e os demais vereditos (funil) continuam.

### Início (fase 5)

- Período lido, comparação com o período anterior: faturamento, pedidos, visitantes, conversão, ticket médio, com variação em % e seta.
- De onde vem cada venda (busca, recomendação, loja, outros), se o Seller Center entregar.
- Shopee Ads no período: investimento, ROAS, custo por pedido, % do faturamento em Ads.
- Os 5 que mais faturaram.

### Funil de Produto (fase 5)

- Placar: perdendo dinheiro, dá para melhorar, indo bem, sem venda.
- Cartão por produto com o funil impressões → cliques → visitantes → carrinho → pedidos e a queda em % entre etapas.
- Maior perda: a etapa em que a conversão do produto está mais abaixo da média da loja.
- Vereditos (cortes na configuração, padrões a calibrar na fase 3):
  - **Sem venda**: 0 pedidos no período.
  - **Recebe clique e não vende**: cliques ≥ 100 e conversão menor que metade da média da loja.
  - **Vende sozinho e ainda não tem anúncio**: pedidos ≥ 5, conversão ≥ média e nenhuma campanha ativa.
  - **Indo bem**: conversão ≥ média e pedidos ≥ 5.
  - **Perdendo dinheiro**: tem Ads e o lucro por unidade com Ads é negativo (precisa do custo).
- Ações fixas por veredito, como no vídeo (comparar com os 3 que mais vendem na busca, revisar foto e preço do card, responder avaliações).

### Shopee Ads (fase 6)

Por campanha: ROAS real, CTR, CPC, custo por pedido, pedidos, orçamento.
- **Equilíbrio** = ROAS mínimo do produto, da calculadora (`preço / (preço − taxa − imposto − custo de produção)`).
- Vereditos:
  - ROAS real < equilíbrio → **Pausar ou ajustar** (vermelho)
  - equilíbrio ≤ ROAS < 1,5 × equilíbrio → **Otimizar** (amarelo)
  - ROAS ≥ 1,5 × equilíbrio e gasto do dia perto do orçamento → **Cabe mais investimento: suba 20%, meça 7 dias** (verde)
  - cliques ≥ 50 e 0 pedidos → **Recebe clique e não vende**
- "O orçamento cabe?": cliques por dia e vendas por dia no ritmo atual.

### Marketing e Afiliados (fase 7)

- O que está no ar: cupons, descontos, campanhas de destaque, com término.
- Quanto cada ferramenta devolveu: vendas, pedidos, variação.
- Afiliados: faturamento do canal, pedidos, comissão paga, custo por pedido, comparado ao custo por pedido de Ads.

### Relatório (fase 7)

- Texto em Markdown montado pelas regras: identificação, período atual e anterior, snapshot executivo em tabela, vereditos de cada aba.
- Botões: Copiar texto, Baixar `.md` (nome `AAAA-MM-DD-shopee-fcs.md`, para mover a `dados/marketplace/<data>/shopee/`), Imprimir em PDF.
- A skill `/marketplace` passa a aceitar esse arquivo como fonte, quando existir.

---

## Fase 3: roteiro de descoberta do Seller Center

Feita com a sessão do Chrome conectada pelo terminal, ou por HAR. Só leitura, sem alterar campanha, preço ou anúncio.

1. Abrir com a aba Network gravando: Dados do Negócio (visão geral, produtos, tráfego), Shopee Ads (lista de campanhas e uma campanha aberta), Centro de Marketing (cupons, descontos, campanhas), Afiliados, Saúde da conta.
2. Para cada página: URL do endpoint, parâmetros de período, campos de cada métrica.
3. Saída: `docs/mapa-seller-center.md` e amostras limpas em `testes/amostras/vendedor/`, sem nome de comprador, endereço, telefone ou token.
4. Confirmar o que a fase 2 precisa: uma amostra da página inicial (Descobertas do dia) e de uma página de loja, no lado comprador.

## Erros

- Resposta com formato inesperado: aviso `[FCS SPY]` no console, seção mostra "sem dado", a página da Shopee segue normal.
- Escuta e coleta nunca alteram, atrasam ou repetem requisição da Shopee na v3.

## Fora do escopo da v3

IA na extensão, relatório em PDF interpretado por IA, gerador de foto, Mercado Livre, venda da extensão (licença).
