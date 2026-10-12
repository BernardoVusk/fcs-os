# Fórmulas de custo e preço

Fonte única das fórmulas do motor de custos (`src/dominio/custos`, `src/dominio/precos`). Os casos abaixo são hipóteses de teste, não taxas reais; a cópia legível por máquina está em `src/dominio/custos/casos.json` e os testes leem de lá. Versão do motor: `VERSAO_MOTOR` em `src/dominio/custos/motor.ts` (gravada em cada cálculo salvo).

## Entradas

Peça ou ordem: `peso_g` (peso do fatiador, com suportes e purga da peça), `tempo_ciclo_min`, `pecas_por_ciclo` (n), `taxa_falha` (f, fração de tentativas perdidas, 0 <= f < 1), `desperdicio` (w, fração de material extra), `custo_g` do filamento (custo de reposição do insumo: média ponderada, última compra ou manual), impressora (custos por hora derivados), tempos de mão de obra (`preparo_ciclo_min`, `acabamento_peca_min`, `embalagem_peca_min`), `custo_hora_mao_obra`, complementares por peça e por pedido, parâmetro de fixo (método hora, peça ou desligado), canal (frações sobre o preço e fixos por item).

Regra anti-dupla-contagem: `w` incide só sobre material; `f` incide sobre tudo que se perde quando uma tentativa falha (material, máquina, energia, preparo, fixo por hora). Acabamento, embalagem e complementares só acontecem em peça boa e não recebem `f`.

## Impressora (custos por hora)

```
custo_hora_depreciacao = (custo_aquisicao - valor_residual) / vida_util_horas
custo_hora_manutencao  = custo_manutencao_ano / horas_produtivas_ano
custo_hora_consumiveis = custo_consumiveis_ano / horas_produtivas_ano
custo_hora_energia     = potencia_media_w / 1000 * tarifa_kwh
```

## Custo por peça boa

```
fator_falha          = 1 / (1 - f)
horas_peca           = tempo_ciclo_min / 60 / n
horas_por_peca_boa   = horas_peca * fator_falha
gramas_por_peca_boa  = peso_g * (1 + w) * fator_falha
material             = gramas_por_peca_boa * custo_g
depreciacao          = horas_por_peca_boa * custo_hora_depreciacao
manutencao           = horas_por_peca_boa * custo_hora_manutencao
consumiveis          = horas_por_peca_boa * custo_hora_consumiveis
energia              = horas_por_peca_boa * custo_hora_energia
preparo              = (preparo_ciclo_min / 60 / n) * custo_hora_mao_obra * fator_falha
acabamento           = (acabamento_peca_min / 60) * custo_hora_mao_obra
embalagem_mo         = (embalagem_peca_min / 60) * custo_hora_mao_obra
complementares_peca  = soma(qtd * custo_unitario) dos itens por peça
fixo_rateado         = hora: horas_por_peca_boa * (custo_fixo_mensal / horas_produtivas_mes)
                       peca: custo_fixo_mensal / volume_mensal_estimado
                       desligado: 0
C (custo por peça)   = material + depreciacao + manutencao + consumiveis + energia + preparo
                       + acabamento + embalagem_mo + complementares_peca + fixo_rateado
```

Fixo rateado serve só para precificar. Custo realizado de ordem de produção (Fase 5) usa só a parte variável.

## Formação de preço

```
t  = comissao_pct + taxa_pagamento_pct + imposto_pct + ads_pct        (frações sobre o preço)
F  = taxa_fixa_item + frete_subsidio + complementares_pedido           (fixos por unidade vendida)
P0 = (C + F) / (1 - t)                     equilíbrio, se 1 - t > 0
Pm = (C + F) / (1 - t - m)                 margem m sobre o preço, se 1 - t - m > 0
Pk = (C * (1 + k) + F) / (1 - t)           markup k sobre o custo, se 1 - t > 0
num preço P:  lucro = P * (1 - t) - C - F;  margem = lucro / P;  markup_efetivo = lucro / C
              taxas_no_preco = P * t + F
              margem_contribuicao = P * (1 - t) - F - (C - fixo_rateado)
              resultado_liquido = margem_contribuicao - fixo_rateado
sem taxas:    m = k / (1 + k)   (markup 50 % = margem 33,3 %)
```

Inviável: se o denominador é <= 0 a função devolve `{ viavel: false, motivo: "percentuais_sobre_preco_excedem_100", soma_percentuais: t + m, margem_maxima_exclusiva: 1 - t, preco: null }`, nunca um número. Quando só o preço por margem é inviável, o equilíbrio ainda é devolvido. Aviso `margem_sensivel` quando o denominador fica entre 0 e 0,10.

## Arredondamento

Precisão cheia dentro do cálculo (`decimal.js`); componentes a 4 casas; custo por grama a 6; frações a 6; dinheiro a 2; `ROUND_HALF_UP`. Exceção: preço sugerido arredonda para cima (`ROUND_CEIL`) a 2 casas, porque a meta é um piso. Margens exibidas são recalculadas no preço arredondado.

## Casos de referência

Parâmetros comuns (Anexo A): impressora 4500,00 com residual 500,00 e vida 8000 h, 120 W, manutenção 400,00/ano, consumíveis 200,00/ano, 2000 h/ano, tarifa 0,95/kWh, mão de obra 30,00/h, filamento 0,125/g. Derivados: depreciação 0,5000/h, manutenção 0,2000/h, consumíveis 0,1000/h, energia 0,1140/h.

| Caso | Entradas | Esperado |
|---|---|---|
| A1 | 40 g, 120 min, 1 peça, f 0, w 0, preparo 5, acabamento 4, embalagem 3, complementares 0,40, fixo desligado; canal 14 % + 2 % + 6 %, fixa 4,00; margem 25 % | material 5,0000; depreciação 1,0000; manutenção 0,4000; consumíveis 0,2000; energia 0,2280; preparo 2,5000; acabamento 2,0000; embalagem 1,5000; complementares 0,4000; C 13,2280; t 0,22; F 4,00; P0 22,09; Pm 32,51; taxas no preço 11,1522; margem de contribuição 8,1298; margem 25,01 % |
| A2 | 25 g, 300 min, 6 peças, f 0,10, w 0,05, preparo 10, acabamento 3, embalagem 2, complementares 0,80, fixo 300/mês em 150 h; canal 17 % + 6 % + ads 3 %, fixa 6,75; margem 20 % | peças boas 5,4; 29,1667 g; 0,9259 h; material 3,6458; depreciação 0,4630; manutenção 0,1852; consumíveis 0,0926; energia 0,1056; preparo 0,9259; acabamento 1,5000; embalagem 1,0000; complementares 0,8000; variável 8,7181; fixo 1,8519; C 10,5699; P0 23,41; Pm 32,08 (32,0739 para cima); contribuição 8,2711; líquido 6,4193; margem 20,01 %; em 32,07 seria 19,99 % |
| A3 | C e F de A1; canal 20 % + 5 % + 15 % + 10 % (t 0,50); margem 50 % | viável false, soma 1,0000, margem máxima exclusiva 0,5000, Pm null, P0 34,46; com t 1,05 P0 também null |
| A4 | entradas de A1; markup 50 % contra margem 50 % | markup: 30,57, lucro 6,6166, 50,02 % do custo, 21,64 % do preço; margem: 61,53, lucro 30,7654, 232,58 % do custo, 50,00 % do preço |
| REF 7.4 | filamento 0,06/g, 50 g, w 5 %, f 5 %, impressora 2000 sem residual e 4000 h, 120 W, manutenção 300/ano em 1500 h, 240 min, 1 peça, preparo 10, acabamento 10, mão de obra 30, complementar 1,50, fixo 600/mês em 200 h; canal 20 % + 6 %, fixa 4,00; margem 25 %; markup 25 % | material 3,3158; máquina 2,9474; energia 0,4800; preparo 5,2632; acabamento 5,0000; complementares 1,5000; fixo 12,6316; C 31,1379 (31,137894 exato); P0 47,49; Pm 71,71 (margem 25,0 %); Pk 58,01 (margem 13,4 %) |

## Bugs prováveis com teste de regressão

Aplicar falha a acabamento, embalagem ou complementares; compor desperdício como 1/(1-w) ou aplicá-lo ao tempo; taxa fixa fora do denominador ou margem aplicada depois das taxas; preço arredondado para baixo da meta; snapshot que muda quando o filamento muda de preço. Cada um está em `custo-peca.test.ts`, `preco.test.ts` ou `motor.test.ts`.
