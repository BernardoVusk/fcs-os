# Empresa

> Memória central do negócio. O Claude lê esse arquivo antes de cada resposta.
> Você pode editar a qualquer momento.

**Nome:** FCS 3D STUDIO
**Negócio:** E-commerce de produtos feitos em impressão 3D
**O que faz:** Vende online produtos impressos em 3D, com portfólio de itens sob demanda que o cliente pode pedir
**Perfil:** Empresa (operação solo hoje, estruturada pra crescer)
**Atende clientes:** Pessoas que gostam de comprar online e têm hobbies como jogos de videogame, miniaturas, Fórmula 1 e carros. Público colecionador e entusiasta.
**Equipe:** Uma pessoa tocando tudo (produto, marketplace, anúncios, marketing, produção)
**Ferramentas:** Shopee, Mercado Livre, TikTok Shop, impressoras 3D
**Principais entregas:** Produtos físicos impressos em 3D vendidos em marketplace e e-commerce, catálogo sob demanda

## Canais de venda

### Shopee
- Loja: https://shopee.com.br/fcs3dstudio
- shop_id: 1478228631
- Central do vendedor: seller.shopee.com.br

Retrato em 21/08/2026, obtido da API pública da loja:
- 26 produtos à venda
- 286 seguidores
- Nota 4.876
- 1.627 avaliações no total: 1.572 boas, 46 normais, 9 ruins
- Vendedor verificado por telefone e email
- Taxa de resposta 46%, tempo médio de resposta 93 minutos
- Descrição da loja cadastrada: "Itens de decoração"

Dois pontos a corrigir, identificados nesse retrato:
1. A descrição diz "Itens de decoração", que não conversa com o público real de games, miniaturas, Fórmula 1 e carros. A loja se apresenta pro comprador errado.
2. Taxa de resposta de 46% é baixa. A Shopee usa esse indicador no ranqueamento e na exibição de selo.

### Mercado Livre
- Nome da loja: FCS 3D STUDIO
- URL e nickname do vendedor: a capturar na primeira coleta pelo browser

### TikTok Shop
- Nome da loja: FCS 3D STUDIO
- Central do vendedor: seller-br.tiktok.com

## Como os dados dos canais chegam aqui

As três plataformas bloqueiam acesso automatizado de fora, testado e confirmado em 21/08/2026: a Shopee devolve página vazia e 403 nos endpoints de catálogo, o Mercado Livre devolve 403 no site e passou a exigir token OAuth na API pública, o TikTok Shop exige login.

A coleta acontece pelo browser logado, com a extensão Claude in Chrome. A skill `/marketplace` faz essa leitura. O bruto fica em `dados/marketplace/`, o catálogo unificado em `dados/catalogo/`.

## Ferramentas internas

### FCS SPY
Extensão de Chrome própria, versão 1 pronta em 27/09/2026, em `mini-projetos/fcs-spy/`. Roda na busca da Shopee e mostra em cada produto: dias no ar, quanto o vendedor recebe, vendas 30 dias, vendas totais, faturamento estimado, custo alvo por margem e tendência desde a última leitura. Na página de produto, calcula o lucro de imprimir aquele item em 3D (filamento, energia, desgaste, acabamento, embalagem, taxa Shopee, imposto, ads). Guarda uma leitura por anúncio por dia. Uso interno hoje, pensada para vender depois. Custos reais (filamento, energia, desgaste, mão de obra, embalagem, imposto, comissão) nunca vão no código: cada usuário preenche e salva na tela de opções da própria extensão. Os valores de fábrica são só ponto de partida.

## Contexto adicional

- Modelo de venda: catálogo de produtos sob demanda. O cliente pede, o estúdio imprime.
- Nichos de produto que conversam com o público: games, miniaturas colecionáveis, Fórmula 1, automobilismo e carros.
- O crescimento depende de descobrir produtos 3D novos pra vender e acompanhar o que está em alta nos marketplaces.
