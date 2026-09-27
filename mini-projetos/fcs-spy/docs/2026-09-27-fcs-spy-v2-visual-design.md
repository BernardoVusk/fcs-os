# FCS SPY v2: novo visual

Data: 27/09/2026
Status: visual aprovado pelo usuário no mockup
Referência visual obrigatória: `mockup-v2.html` e `mockup-v2.png` nesta pasta.

## Objetivo

Trocar o visual escuro e quadrado da v1 por um visual moderno e limpo: fundo branco, bordas arredondadas, ícones SVG inline, números grandes em destaque. Nenhuma regra de negócio muda: fórmulas, histórico, escuta e tradução ficam como estão.

## Exceção ao design guide

`identidade/design-guide.md` proíbe fundo claro e pede cantos retos. Por decisão do usuário, a extensão é exceção: fundo branco e cantos arredondados. A paleta continua: preto `#0A0A0A` e ciano `#00D8FF`. Posts, carrosséis e demais peças seguem o guide.

## Tokens

| Token | Valor | Uso |
|---|---|---|
| fundo | `#FFFFFF` | card, barra, painel, tela de opções |
| superficie | `#F3F5F6` | blocos internos, campos, pílulas |
| linha | `#E6E9EB` | bordas e divisórias |
| texto | `#0A0A0A` | texto e números |
| suave | `#6B7177` | rótulos, texto secundário, ícones |
| ciano | `#00D8FF` | preenchimento de destaque (chip subindo, interruptor, ponto de estimativa, foco) |
| ciano-claro / ciano-escuro | `#E0F9FF` / `#006B80` | selo Indicado, ícone de grupo nas opções |
| raio | 14px card, 10px bloco, 18px painel, 20px opções, 999px pílula e botão |
| sombra | `0 1px 2px rgba(10,10,10,.04), 0 8px 24px rgba(10,10,10,.06)` | só elementos que flutuam sobre a Shopee |

Ciano nunca é cor de texto sobre branco (contraste insuficiente). Texto sobre ciano é preto.

Fonte: `Inter, "Segoe UI", system-ui, sans-serif`. Números com `font-variant-numeric: tabular-nums`.

## Ícones

SVG inline, traço 1.8, 14px, `stroke: currentColor`, `aria-hidden="true"`. Conjunto: calendário, carteira, sobe, cai, seta, copiar, coração, balão, estrela, ordenar, engrenagem, menos, mais, cubo, loja, alvo, check. Um módulo só (`src/ui/icones.ts`) cria todos.

## Card da busca (decisões do usuário: destaque em Vendas 30D; resumo com "ver mais")

Fechado:
- Linha de meta em cinza: dias no ar (ícone calendário) e quanto o vendedor recebe (ícone carteira), com `title` explicando cada um.
- Rótulo "Vendas 30D", número grande e chip de tendência:
  - subindo: fundo ciano, texto preto, `+N`
  - caindo: fundo preto, texto branco, `-N`
  - estável: cinza, `0`
  - primeira leitura: cinza, `1ª leitura`
  - sem dado de vendas: cinza, `sem dado`
  - histórico indisponível: cinza, `sem histórico`
  - O `title` do chip traz a frase completa de `textoHistorico` (inclui variação de preço).
- Dois blocos: "Fatur. 30D" e "Por dia", em formato curto (`R$ 11,4 mil`, `R$ 380`), com ponto ciano de estimativa.
- Botão "ver mais" com seta.

Aberto ("fechar" com seta para cima), ali mesmo:
- Vendas total, Fatur. total (valor completo, com ponto de estimativa), Preço (menor)
- Custo alvo em pílulas (`10% R$ 2,93`)
- Likes, reviews e nota com ícones
- Selos (Indicado, Loja oficial, Ads) em pílula ciano-claro
- Loja com botão redondo de copiar
- Legenda: ponto ciano = estimativa com o menor preço atual
- A frase do histórico

## Barra flutuante

Pílula branca: logo (quadrado preto com miolo ciano) + "FCS SPY", seletor de ordenação (select nativo estilizado, ícone ordenar), interruptor ligar/desligar (`role="switch"`, `aria-checked`), botão redondo engrenagem que abre as configurações.

## Painel da calculadora

- Topo: logo + "Calculadora", botões redondos engrenagem (Custos) e menos/mais (Recolher/Abrir), com `aria-label`.
- Resumo cinza: "Vendas 30D" grande e a linha de leitura (`textoLeitura`).
- Campos em grade de duas colunas, unidade dentro do campo: Variação (se houver), Preço de venda (R$), Filamento (g), Impressão (h), Acabamento (min), ROAS (x).
- Shopee Ads como interruptor (checkbox estilizado).
- Bloco preto "Lucro por unidade" com valor grande, margem em chip ciano e ROAS mínimo.
- Lista com ícones: Custo de produção, Taxa Shopee, Imposto, Ads.
- Todas as regras de `sem dado` da v1 continuam.

## Tela de configurações ("Seus custos")

Página cinza clara com cartão branco central. Grupos com ícone: Shopee e imposto; Impressão 3D; Acabamento e envio; Custo alvo. Campo com unidade dentro (R$, %, /kg, W, /kWh, /h). Botão preto "Salvar custos". Status "Salvo" com ícone de check.

## Verificação visual

Página de prévia (`src/previa/`) que monta os componentes reais com dados de exemplo, gerada pelo build fora de `dist/`. Print em Chromium headless comparado ao mockup antes de dar por pronto.

## Fora do escopo

Regras de negócio, escuta, tradução, histórico, ordenação, formato dos dados salvos.
