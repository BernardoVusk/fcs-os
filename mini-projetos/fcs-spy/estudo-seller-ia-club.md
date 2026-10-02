# Estudo: Seller.IA Club (referência para o FCS SPY)

Data: 02/10/2026
Fonte: landing https://selleriaclub.com.br/ (texto e maquete lidos no Chrome). A extensão em si só existe para assinante; nada aqui vem de uso real dela.

## O que é

Não é uma extensão avulsa como o Ziem Spy. É um clube por assinatura da Efeito Vendas (Karina Leite, influenciadora oficial Shopee), R$ 147/mês via Hotmart ("de R$ 897"), 7 dias de garantia, sem fidelidade. Junta cinco coisas:

1. **IA Analista de Conta**: a extensão. Mora dentro da conta de vendedor e lê o painel da Shopee.
2. **IA Analista de Ads**: cruza ROAS com margem, SKU por SKU.
3. **Clip.Seller**: gera foto, título, descrição e vídeo do produto a partir de uma foto crua. Funciona por créditos (100 de boas-vindas, 50 por mês).
4. **IA de Precificação**: custo e margem entram, saem preço de venda e ROAS mínimo.
5. **Escola**: aulas ao vivo semanais e 14 cursos gravados. Bônus: sourcing na China.

## A extensão (pela maquete)

Painel lateral dentro do Seller Center, com abas: Início, Funil de Produto, Shopee Ads, Espião, Marketing, Afiliados (o texto cita também Precificação e Relatório).

Tela "Conta 360", com alternância "A conta / Especialista":
- Lê o período que estiver aberto no painel da Shopee ("01/09 a 05/09, o recorte que estava aberto").
- Cabeçalho: "51 campanhas, 155 produtos, lido há 3 min" e um selo REC.
- Três cartões com número e frase de interpretação:
  - Ads: retorno médio de 11,4x, custo por pedido via anúncio R$ 6,38 contra ticket de R$ 72,73.
  - Peso do anúncio: 9,4% do faturamento foi para Ads, "dentro do saudável, dá para escalar".
  - Funil: de cada 100 visitantes, 3,2 compram.
- Botão "Recoletar conta + Analisar", que gera o relatório.

Saídas prometidas: 18 métricas comparadas mês a mês (GMV, ROAS, TACOS, CPA, conversão), nota em 5 dimensões (precificação, funil, cadastro, marketing, ads), top 5 produtos, risco de concentração em 1 ou 2 produtos, plano semanal, projeção em 3 cenários e PDF.

## Como deve funcionar por baixo (hipótese)

- Dados da própria conta do vendedor, lidos no Seller Center logado. Mesma técnica do FCS SPY (escutar a resposta que a página já recebe) ou leitura do DOM.
- A interpretação em texto e o PDF quase certamente saem de um LLM no servidor deles. Por isso existe o botão "Analisar" e o modelo de créditos.
- "Espião" deve ser a mesma ideia do Ziem: números de concorrente na busca.

## Pontos de atenção

- **A conta deles sobre ROAS está errada na landing.** Eles dizem que ROAS 12x com margem de 15% dá prejuízo. Com ROAS 12x o anúncio custa 8,3% do preço, menos que 15% de margem: dá lucro. O ponto de equilíbrio é ROAS = 1 / margem (com 15%, 6,7x). A ideia certa por trás é: o ROAS mínimo depende da margem de cada produto. O FCS SPY já calcula isso.
- Depoimentos com cara de modelo (o mesmo "R$ 12.400" aparece no caso e num depoimento) e comentários de edição esquecidos no HTML ("PARA EDITAR cards"). Tratar os números da página como marketing, não como dado.
- "Regras 2026, taxa Shopee + frete grátis": a comissão muda conforme o programa de frete. O padrão do FCS SPY (20% + R$ 4) precisa ser conferido com a conta da FCS.

## Ziem Spy x Seller.IA x FCS SPY

| | Ziem Spy | Seller.IA Club | FCS SPY hoje |
|---|---|---|---|
| Onde roda | Busca da Shopee (comprador) | Seller Center (vendedor) | Busca e produto (comprador) |
| Olha para | Concorrentes | A própria loja, mais concorrentes | Concorrentes |
| Calculadora | Margem de revenda | Preço e ROAS mínimo | Lucro de imprimir em 3D e ROAS mínimo |
| Interpretação | Não | Texto por IA, relatório em PDF | Não (o Claude faz pelo /marketplace) |
| Preço | R$ 47/mês | R$ 147/mês | Interno |

## O que vale trazer para a FCS

Em ordem de valor para uma operação de uma pessoa, com o gargalo atual (pesquisa de produto e leitura semanal de métricas):

1. **Modo vendedor no FCS SPY**: escutar as respostas do Seller Center (vendas, visitas, conversão, Shopee Ads por campanha) da própria conta. Resolve a coleta da rotina `/marketplace`, que hoje depende de o Claude abrir o Chrome. Exporta um arquivo para `dados/marketplace/<data>/shopee/`.
2. **Veredito por anúncio**: com o ROAS real de cada campanha e o custo de cada produto, marcar pausar, otimizar ou escalar. Regra simples: ROAS real abaixo do ROAS mínimo pausa; até 1,5x o mínimo otimiza; acima escala. É conta, não precisa de IA.
3. **Calculadora ao contrário**: digitar a margem desejada e receber o preço de venda. Pequeno, cabe no painel atual.
4. **Funil por produto**: visitas, carrinho, conversão. Vem junto com o item 1.

O que não vale copiar agora: gerador de foto e vídeo, escola, relatório em PDF por IA. O Claude já faz a interpretação dentro do `/marketplace`, sem custo por crédito.

## Para confirmar antes de construir o item 1

Uma captura HAR do Seller Center logado (`seller.shopee.com.br`): página de Dados do Negócio, página de Shopee Ads (lista de campanhas) e página de Produtos. Com a sessão do Chrome conectada, o Claude pode fazer essa leitura direto.

## Por dentro: vídeo de demonstração (02/10/2026)

Fonte: `referencia de extensão/kaalineleite.mp4` (52 s, gravado da tela de um monitor, nome da loja borrado). Lido quadro a quadro, 1 por segundo. Sem áudio transcrito: a legenda é só "Um absurdo o que essa IA faz na sua conta da Shopee!".

### Moldura

- Painel lateral branco aberto dentro do Seller Center. Cabeçalho: logo, nome da loja, "52 campanhas · 225 produtos · lido há 48 min", selo REC, botão de tema escuro, fechar.
- Botão flutuante "S." na borda da página para abrir e fechar o painel.
- Nove abas em duas linhas: Início, Funil de Produto, Shopee Ads, Espião, Marketing, Afiliados, Precificação, Relatório, Ajustes. Cada seção tem um número grande à direita (04, 05, 06, 09).
- Padrão de todo cartão: título-veredito em linguagem simples, faixa de números grandes, uma frase que explica o número, setas "→" com a ação.
- Cor do cartão diz o estado: vermelho = perdendo dinheiro, verde = indo bem ou cabe mais investimento.

### Início (Conta 360)

- Canais de venda no período (afiliados, vídeo, live), com "não usa: live, canais parados".
- "Os que mais faturaram": lista de produtos com CTR, conversão, rejeição e faturamento de cada um, com link do produto.
- "Shopee Ads no período": investimento, campanhas ativas, retorno (venda ampla) e ROAS, impressões, cliques, CTR, CPM, CPC, pedidos por anúncio, custo por pedido.
- "Saúde / avaliações": saúde da conta (Excelente) e pontos de penalidade.
- "De onde vem cada venda": barras por origem (busca 56,7%, recomendação 23,7%, outros, sua loja, carrinho), com % das vendas, clique para pedido e ticket por origem. Frase: "Divisão equilibrada. A busca é o que você controla."
- Comparação com o período anterior (GMV, pedidos, visitantes, conversão).

### Funil de Produto

- Placar no topo: 5 perdendo dinheiro, 2 dá para melhorar, 11 vendendo bem, 212 sem venda.
- Seções "Os que mais precisam de você" e "Os que estão indo bem".
- Cartão por produto com veredito ("Recebe clique e não vende", "Vende bem sem nenhum anúncio", "Vende sozinho e ainda não tem anúncio") e o funil: viram na busca → clicaram → visitantes → no carrinho → compraram, com a queda em % entre cada etapa.
- Frase sobre onde está a maior perda ("A maior perda está entre viram na busca e clicaram: perde 97% aqui. Quem vê o card não entra. O que decide é a primeira foto, o preço no card e o começo do título").
- Ações: "Comparar com os 3 que mais vendem nesta busca", "Abra a página no celular", "Responda as avaliações pendentes", "É o produto mais barato para começar a anunciar".

### Shopee Ads

- Cartão por campanha com veredito ("Aqui cabe mais investimento", "Recebe clique e não vende"), posição média, ROAS, CTR, CPC, CPA, CPM, pedidos.
- "Entrega 14,2x contra o equilíbrio de 4,0x": ROAS real contra o ROAS mínimo do produto.
- Ações com número: "Suba o orçamento em 20%, não mais que isso de uma vez", "Meça 7 dias antes do próximo aumento".
- "O orçamento cabe?": cliques/dia, vendas/dia, orçamento diário.
- Funil da campanha: impressões → cliques → carrinho → pedidos.
- "Toque para analisar margem, leilão e palavras".

### Espião

- Sub-abas "Espiar produto" e "Palavras". Modos "Meus produtos" e "Buscar termo".
- Escolhe um produto seu e um termo de busca, botão "Comparar". O volume vem da própria Shopee (vendas dos últimos 30 dias; faturamento = vendas x preço exibido).
- "Radar 360": produto pago à parte para ler o nicho inteiro.

### Marketing

- "O que está no ar agora": campanhas de marketing ativas.
- "Campanha de destaque Shopee": lista de campanhas com término e produtos inscritos, com alerta "a taxa costuma ser de 3,5% sobre todo o faturamento do período, cadastre o custo dos produtos para calcular quanto isso consome da margem".
- "Quanto cada ferramenta devolveu": desconto, cupom etc., com vendas, pedidos e variação.

### Afiliados

- "Cada venda por afiliado custa 5,0x menos que por anúncio" (R$ 2,25 por pedido contra R$ 11,34).
- GMV do canal, pedidos, ROI, comissão paga, itens vendidos.

### Precificação

- "Por quanto vender" e "Margem de um preço". Campos: custo do produto, embalagem, ads por venda, margem desejada, imposto. Devolve o preço e o ROAS mínimo.

### Relatório

- "Relatório da conta" e "Panorama semanal". Botões Salvar em PDF, Copiar texto, Gerar outro.
- Texto em Markdown: identificação, período atual contra anterior, snapshot executivo em tabela (GMV pago, pedidos pagos, visitantes, com variação).

### Leitura técnica

- "lido há 48 min" e REC indicam coleta: a extensão grava os dados do Seller Center (provavelmente escutando ou repetindo as chamadas da própria página) e analisa depois.
- Quase tudo é regra sobre número (funil, ROAS contra equilíbrio, orçamento). Só o Relatório tem cara de texto de IA.
