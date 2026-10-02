# FCS SPY: checagem manual no Chrome

Rodar a cada versão nova, com o Chrome logado na Shopee.

Última rodada: 27/09/2026, feita pelo Claude via extensão Claude in Chrome,
na busca "miniatura f1" (páginas 1 e 2) e no produto "Miniaturas Pneus Fórmula 1".

## Instalar

1. `npm run build` em `mini-projetos/fcs-spy/extensao/`
2. Chrome, `chrome://extensions`, ligar "Modo do desenvolvedor"
3. "Carregar sem compactação", escolher a pasta `extensao/dist`
4. Depois de cada build, clicar no botão de recarregar da extensão e recarregar a aba da Shopee

## Busca

- [ok] Buscar "miniatura f1". Cada card da primeira tela ganha o painel preto e ciano embaixo
- [ok] Conferir um card: "Vendas 30D" igual ao "Vendido/Mês" que a Shopee mostra no próprio card
- [ok] Recebe, faturamento e custo alvo batem com a conta de cabeça (preço x 0,8 menos 4)
- [ok] Rolar a página: cards novos que carregam também recebem o painel
- [ok] Clicar no painel não abre o produto. Clicar na foto abre
- [ok] Botão "Copiar" copia o nome da loja
- [ok] Layout da grade não quebra. Se o painel ficar cortado ou empurrar a grade, anotar: a hipótese do `<li>` como container em `containerDoCard` precisa de ajuste
- [ok] Barra FCS SPY no canto superior direito
- [ok] Ordenar por Vendas 30D: a grade reordena, maior primeiro
- [ok] Ordenar por Mais novos e Mais antigos
- [ok] Botão Desligar esconde os painéis. Ligar mostra de novo
- [ok] Ir para a página 2 da busca: cards da página 2 recebem painel

## Histórico

- [ok] Primeira busca do dia: cards mostram "primeira leitura"
- [ ] No dia seguinte, mesma busca: cards mostram "subindo", "caindo" ou "estável" com a diferença

## Produto

- [ok] Abrir um produto a partir da busca: painel da calculadora aparece à direita
- [ok] Topo do painel mostra vendas 30D e a data da leitura
- [ ] Produto aberto por link direto, sem passar pela busca: mostra "abra pela busca para ver vendas"
- [ok] Com variações: o seletor lista cada uma com preço e troca o preço de venda
- [ok] Preencher gramas e horas: lucro e margem mudam na hora
- [ok] Vitrine "mais vendidos" no pé da página recebe painel nos cards
- [ok] Voltar para a busca: o painel da calculadora some

## Configurações

- [ ] Clique no ícone do FCS SPY na barra do Chrome: abre a tela preta de configurações
- [ ] Na página de produto, botão "Custos" do painel da calculadora: abre a mesma tela
- [ ] Clique direito no ícone da extensão, "Opções": abre a tela preta com os campos
- [ ] Mudar a comissão para 18 e salvar. Na aba da Shopee, os cards recalculam sem recarregar

## Saúde

- [ok] Console da aba sem erro vermelho vindo da extensão. Avisos `[FCS SPY]` só em caso de formato inesperado
- [ok] Busca, carrinho e login da Shopee continuam funcionando normalmente
- [ok] Página não fica lenta ao rolar
- [ ] Aba Performance do DevTools por 60 s numa busca, depois de passar por 3 páginas de resultado: sem trecho longo amarelo repetido vindo de content.js
- [ok] Nenhum captcha ou verificação nova na conta Shopee depois de instalar
- [ok] Painel da calculadora não cobre o botão "Comprar agora"

## Cobertura geral (v3)

Em cada página: o painel aparece nos produtos? A grade quebra? O painel cabe no card?

- [ ] Página inicial, Descobertas do dia
- [ ] Página de categoria (ex.: Brinquedos e Hobbies)
- [ ] Página de uma loja (ex.: fcs3dstudio)
- [ ] Busca, ordenada por Mais vendidos
- [ ] Página de produto: similares e "da mesma loja"
- [ ] Ofertas relâmpago

Para cada item que falhar, anotar: a página, se a resposta chega (aviso no console ou não) e como o card da Shopee é montado ali (o `<li>` existe?).

## Cores das vendas (v3)

- [ ] Produto com 300+ vendas no mês: número e borda verdes
- [ ] Produto entre 50 e 299: amarelo
- [ ] Produto com menos de 50: vermelho
- [ ] Mudar "Verde a partir de" para 1000 em Seus custos: os cards recalculam sem recarregar

## Pendências conhecidas

- Selo Ads: confirmar com uma busca que tenha anúncio pago (capturar HAR e conferir `is_ads`)

## Notas da rodada de 27/09/2026

Números conferidos no card, com comissão 20% e taxa fixa R$ 4:

- R$ 60,00 recebe R$ 44,00, custo alvo 10% R$ 38,00, 15% R$ 35,00, 20% R$ 32,00
- R$ 17,90 recebe R$ 10,32, custo alvo 10% R$ 8,53, 15% R$ 7,63, 20% R$ 6,74
- Faturamento 30D igual a preço x vendas 30D, média diária igual a faturamento 30D dividido por 30

Ordenação, com 31 painéis na página:

- Vendas 30D: 1.292, 812, 241, 188, 160 ... 0, decrescente do começo ao fim
- Mais novos: 30, 30, 42, 45, 53 dias no ar
- Mais antigos: 562, 523, 481, 388, 331 dias no ar

Calculadora, produto com 10 variações:

- Trocar de "Duro e Chuva" para "Duro e Intermediário" levou o preço de venda de 31 para 37,90 e refez a conta
- Com 30 g e 4 h: custo de produção foi de R$ 1,50 para R$ 8,03, lucro de R$ 23,30 para R$ 16,77, margem de 61,5% para 44,3%
- Ads ligado com ROAS em branco: mostra "sem dado" em Ads, lucro e margem. O comportamento do Fix 5 está de pé no browser

Console: os erros vermelhos da aba vêm todos do bundle da própria Shopee
(`deo.shopeemobile.com/.../shopee__web_enhance_sap`). Nenhum erro e nenhum
aviso `[FCS SPY]` da extensão.

Rolagem: 45 telas de rolagem em cerca de 40 s renderam uma única tarefa longa
de 58 ms. A medição de FPS não valeu porque a aba estava em segundo plano, então
o item da aba Performance continua em aberto.

Selo Ads: nos 5 primeiros cards da página 2, o "Indicado" do painel bateu com a
marca de anúncio da própria Shopee, card a card. A pendência do HAR continua
em aberto porque o `is_ads` não foi conferido na resposta da API.
Correção: "Indicado" é o selo de vendedor indicado (`seller_flag` PREFERRED), não
marca de anúncio pago. A conferência acima valida o selo Indicado, não o selo Ads.

### O que ficou de fora e por quê

- Histórico do dia seguinte: só dá pra conferir amanhã, repetindo a mesma busca
- Produto por link direto: não consegui isolar um produto sem registro salvo, porque
  todo produto alcançável pela Shopee passa antes por uma lista que a extensão captura.
  Pra testar, abrir um produto num perfil do Chrome sem a extensão ter visto aquela busca
- Configurações: a extensão de automação não abre `chrome://extensions` nem
  `chrome-extension://`, então a tela de opções e o recálculo ao salvar a comissão
  precisam ser conferidos na mão
- Aba Performance por 60 s: precisa do DevTools aberto na mão

### Achado novo

A barra do FCS SPY aparece também no carrinho (`shopee.com.br/cart`), onde não há
card nenhum pra ordenar. Não quebra nada, mas é acabamento: vale limitar a barra
às páginas de busca e de produto.
Corrigido depois da rodada: a barra só aparece quando há card do FCS SPY na página.
Conferir no carrinho na próxima rodada.
