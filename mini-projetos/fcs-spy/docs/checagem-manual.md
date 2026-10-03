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

## Vendedor (fase 4)

Recarregar a extensão em `chrome://extensions` e abrir o Seller Center logado.

- [ok] Botão preto com miolo ciano no canto inferior direito; clicar abre o painel "FCS SPY Vendedor"
- [ok] Antes de navegar: as seis fontes mostram "ainda não lido" com o link da página certa
- [ok] Abrir Informações Gerenciais > Visão Geral: "Indicadores do período" e "De onde vêm as vendas" passam a "lido agora há pouco"
- [ok] Abrir Produto > Performance do Produto e passar para a página 2: "Funil por produto" lido (03/10: em Tempo Real a lista tem 1 página só; página 2 testada em Últimos 30 Dias)
- [ok] Abrir Shopee Ads: "Campanhas de Shopee Ads" lido
- [ok] Abrir Afiliados > Principais Indicadores: "Afiliados" lido
- [ok] Abrir Informações Gerenciais > Marketing: "Marketing" com 1 ferramenta (03/10: Descontos lido; Cupom, Oferta Relâmpago e Prêmio da Loja eram descartados por formato diferente, corrigido no mesmo dia)
- [ok] O painel atualiza sozinho enquanto está aberto (03/10: atualiza em navegação interna; link que recarrega a página fecha o painel)
- [ok] Nenhuma verificação de robô nova no Seller Center
- [ok] Console sem erro vermelho vindo da extensão (03/10: sem erro vermelho; um aviso [FCS SPY] de marketing, que era o bug acima)
- [pendente] No console do service worker da extensão (`chrome://extensions` > FCS SPY > service worker): `chrome.storage.local.get(null).then(console.log)` não mostra `SPC_`, token, carteira, pedido nem dado de comprador (03/10: a ferramenta do Chrome não abre páginas de extensão; rodar à mão)
- [pendente] Conferir um número de cada fonte com o que a tela mostra (vendas do período, um produto do funil, gasto e custo por pedido de uma campanha, vendas de afiliados) (03/10: o painel da fase 4 ainda não mostra número; depende da leitura do storage)
- [pendente] Trocar o período para 7 e 30 dias: o funil por produto é substituído, não somado (03/10: período trocado para 30 dias e funil lido; substituição só se confere no storage)
- [pendente] Trocar o tipo de pedido (pago, feito, confirmado) e conferir que o painel continua coerente
- [ok] Abrir Visão Geral e Shopee Ads em duas abas ao mesmo tempo: as duas fontes aparecem como lidas (se uma sumir, anotar: corrida entre abas) (03/10: Visão Geral numa aba nova atualizou o painel aberto na outra)
- [ok] Na Shopee normal, cards e calculadora continuam funcionando (03/10: calculadora na página do produto, Vendas 30D = 5 em vermelho)
- [ok] Período das campanhas de Ads: anotar qual intervalo a tela mostra (a extensão ainda não lê o período dessa resposta) (03/10: a tela de Ads abre em "hoje"; o período está no endereço da página, não na resposta. Fica para a fase 6)

## Custo por produto (fase 4)

- [ok] Na página de um produto da FCS, preencher gramas e horas na calculadora e clicar "Salvar custo deste produto": aparece "Custo salvo para este produto" (03/10: negativo recusado com "Use números a partir de zero")
- [ok] Recarregar a página do produto: gramas e horas voltam preenchidos (03/10: teste feito com 12 g, 1 h, 5 min e depois zerado)

### Achados da rodada de 03/10/2026 (feita pelo Claude no Chrome conectado)

- Corrigido: Marketing tem dois formatos de resposta. Só Descontos usa `key_metrics`; Cupom, Oferta Relâmpago e Prêmio da Loja trazem cada métrica como `{ value, chain_ratio }`. Hot Listing sem uso na loja volta com `result: null` e agora é ignorado sem aviso. Tráfego Fora da Plataforma usa outro endpoint e fica fora da lista.
- Usabilidade: link do painel que troca de aplicativo (Afiliados, Marketing vindo de Afiliados) recarrega a página e o painel fecha. Avaliar guardar aberto/fechado na sessão.
- Usabilidade: o painel aberto cobre os ícones do canto superior direito do Seller Center (avatar, notificações).
- O painel mostra quando cada fonte foi lida, mas não de qual período. Entra na fase 5 junto com os números.

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
