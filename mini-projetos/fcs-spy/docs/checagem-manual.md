# FCS SPY: checagem manual no Chrome

Rodar a cada versão nova, com o Chrome logado na Shopee.

## Instalar

1. `npm run build` em `mini-projetos/fcs-spy/extensao/`
2. Chrome, `chrome://extensions`, ligar "Modo do desenvolvedor"
3. "Carregar sem compactação", escolher a pasta `extensao/dist`
4. Depois de cada build, clicar no botão de recarregar da extensão e recarregar a aba da Shopee

## Busca

- [ ] Buscar "miniatura f1". Cada card da primeira tela ganha o painel preto e ciano embaixo
- [ ] Conferir um card: "Vendas 30D" igual ao "Vendido/Mês" que a Shopee mostra no próprio card
- [ ] Recebe, faturamento e custo alvo batem com a conta de cabeça (preço x 0,8 menos 4)
- [ ] Rolar a página: cards novos que carregam também recebem o painel
- [ ] Clicar no painel não abre o produto. Clicar na foto abre
- [ ] Botão "Copiar" copia o nome da loja
- [ ] Layout da grade não quebra. Se o painel ficar cortado ou empurrar a grade, anotar: a hipótese do `<li>` como container em `containerDoCard` precisa de ajuste
- [ ] Barra FCS SPY no canto superior direito
- [ ] Ordenar por Vendas 30D: a grade reordena, maior primeiro
- [ ] Ordenar por Mais novos e Mais antigos
- [ ] Botão Desligar esconde os painéis. Ligar mostra de novo
- [ ] Ir para a página 2 da busca: cards da página 2 recebem painel

## Histórico

- [ ] Primeira busca do dia: cards mostram "primeira leitura"
- [ ] No dia seguinte, mesma busca: cards mostram "subindo", "caindo" ou "estável" com a diferença

## Produto

- [ ] Abrir um produto a partir da busca: painel da calculadora aparece à direita
- [ ] Topo do painel mostra vendas 30D e a data da leitura
- [ ] Produto aberto por link direto, sem passar pela busca: mostra "abra pela busca para ver vendas"
- [ ] Com variações: o seletor lista cada uma com preço e troca o preço de venda
- [ ] Preencher gramas e horas: lucro e margem mudam na hora
- [ ] Vitrine "mais vendidos" no pé da página recebe painel nos cards
- [ ] Voltar para a busca: o painel da calculadora some

## Configurações

- [ ] Clique direito no ícone da extensão, "Opções": abre a tela preta com os campos
- [ ] Mudar a comissão para 18 e salvar. Na aba da Shopee, os cards recalculam sem recarregar

## Saúde

- [ ] Console da aba sem erro vermelho vindo da extensão. Avisos `[FCS SPY]` só em caso de formato inesperado
- [ ] Busca, carrinho e login da Shopee continuam funcionando normalmente
- [ ] Página não fica lenta ao rolar

## Pendências conhecidas

- Selo Ads: confirmar com uma busca que tenha anúncio pago (capturar HAR e conferir `is_ads`)
