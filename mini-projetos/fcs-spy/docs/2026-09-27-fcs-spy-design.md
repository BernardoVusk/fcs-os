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

Endpoints esperados (confirmar pela captura HAR antes de codar):
- Busca: `/api/v4/search/search_items`
- Produto: `/api/v4/pdp/get_pc` ou equivalente

## Unidades

Cada unidade tem uma função e pode ser testada isolada.

| Unidade | Arquivo | Faz | Depende de |
|---|---|---|---|
| Escuta | `src/page/escuta.ts` | Intercepta fetch/XHR na página e publica o JSON bruto | nada |
| Ponte | `src/content/ponte.ts` | Recebe o postMessage, valida origem, entrega ao content script | Escuta |
| Tradução | `src/shopee/traduzir.ts` | Converte JSON da Shopee no tipo `Anuncio` | nada (função pura) |
| Métricas | `src/nucleo/metricas.ts` | Contas do card | Configurações (valores, não armazenamento) |
| Calculadora | `src/nucleo/calculadora.ts` | Contas de lucro com impressão 3D | idem |
| Histórico | `src/dados/historico.ts` | Grava e lê leituras em IndexedDB | nada |
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
  estoque: number | null
  variacoes: number | null
  selos: { ads: boolean; relampago: boolean; indicado: boolean }
}
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

"Estimativa" aparece com marcação visual discreta no card, porque o faturamento usa o preço atual para todo o período.

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
- ROAS mínimo = preço / (preço menos taxa, imposto e custo de produção). Se o denominador for zero ou negativo, mostra "não fecha sem ads".

Conferência obrigatória (valores do print do Ziem, com filamento, energia, desgaste e acabamento somando 4,80, embalagem 0,20, logo custo de produção 5,00, imposto 4%, comissão 20% + 4): preço 15,90 dá taxa 7,18, imposto 0,64 e ROAS mínimo 5,16.

## Histórico

- Armazenamento: IndexedDB, banco `fcs-spy`, store `leituras`.
- Leitura: `{ itemId, data, preco, vendas30d, vendasTotal }`.
- Uma leitura por anúncio por dia. Se o anúncio aparecer de novo no mesmo dia, a leitura do dia é substituída.
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
- IndexedDB indisponível: card funciona sem histórico, mostrando "histórico indisponível".
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

1. Captura HAR feita no Chrome logado: uma busca na Shopee (rolando até o fim da primeira página) e uma página de produto. Salvar em `mini-projetos/fcs-spy/extensao/testes/amostras/`.
2. Comissão Shopee atual da conta FCS (percentual e taxa fixa).
3. Valores reais de custo de impressão: preço do kg de filamento, potência da impressora, kWh, desgaste, mão de obra, embalagem, imposto.

O item 3 não bloqueia o código: a calculadora roda com padrões editáveis.

## Riscos

- **Termos da Shopee**: escutar dados que o próprio usuário carregou é baixo risco para uso interno. Vender a ferramenta aumenta a exposição. Avaliar antes da fase de venda.
- **Mudança de formato**: a Shopee pode renomear campos. Mitigação: tudo concentrado na Tradução, com amostras reais nos testes.
- **Significado de `sold`**: a hipótese é que `sold` seja vendas dos últimos 30 dias. Confirmar comparando com o "Vendido/Mês" que aparece no card da Shopee.
