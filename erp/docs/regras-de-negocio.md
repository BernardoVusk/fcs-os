# Regras de negócio

## Papéis

- `dono`: tudo.
- `operador`: lê tudo menos financeiro e usuários; escreve em conhecimento, estoque, catálogo, produção, vendas, planejamento e alertas.
- `leitura`: só lê, sem financeiro e sem usuários.
- Usuário do Auth sem linha ativa em `usuarios_app` não acessa nada.
- Ninguém altera o próprio papel nem desativa a própria conta pela tela.

## Canais e taxas

- Taxa é por vigência (`vigente_desde`). A vigente é a mais recente com data até hoje.
- Taxa em branco é "não configurado" e bloqueia o cálculo de preço daquele canal (Fase 4). Nunca há valor padrão.
- Percentuais são digitados em por cento ("14,5") e guardados como fração (0.145).

## Categorias e unidades

- Categoria é única por (escopo, nome); inativar em vez de apagar.
- Unidade tem base e fator (kg = 1000 g; h = 60 min). A base de uma base é nula.

## Auditoria

Toda alteração em cadastro gera linha em `auditoria` com origem (`web`, `mcp`, `script`, `importacao`). O dono consulta.

## Estoque (Fase 3)

- Saldo é sempre na unidade base do insumo; filamento é em gramas. Compra de filamento é em rolos com peso útil por rolo, e cada rolo vira um lote.
- Rascunho de compra não toca o estoque. Confirmar é atômico (`confirmar_compra`): desconto do pedido, frete e outros encargos são rateados entre as linhas por valor (padrão) ou por quantidade, parcelas a 4 casas, a linha de maior base absorve o resíduo. Custo de aquisição da linha = valor da linha menos descontos mais frete e outros rateados. "Preço já inclui frete" zera o rateio do frete. Impostos da nota não são separados.
- A verdade de cada lote é quantidade e valor; o custo unitário é derivado. Custo médio do insumo = soma dos valores dos lotes com saldo / soma das quantidades (6 casas). `ultimo_custo` é o custo unitário do último lote comprado. O motor de custos (Fase 4) usa `origem_custo` do insumo: média (padrão), última compra ou manual; sem saldo, cai na última compra.
- Saída é valorada ao custo do lote de onde saiu. Ao zerar o lote, a saída leva o valor restante, para o lote fechar em 0,0000. Se o lote informado não basta, o restante sai do lote mais antigo com saldo (PEPS) e abre alerta `lote_dividido`. Sem lote informado, sai do mais antigo.
- Estoque negativo é bloqueado. Única exceção: consumo de produção com `permitir_negativo`, lote informado e justificativa; o lote fica `divergente` e abre alerta `estoque_negativo` (crítico). Saída comum, perda, devolução e ajuste nunca aceitam.
- Ajuste tem sinal: positivo entra no lote informado ao custo do lote (ou cria lote `AJ-` ao custo médio); negativo sai como as demais saídas. Perda e ajuste negativo saem ao custo do lote e não entram em custo de ordem de produção.
- Alerta `estoque_baixo` abre quando saldo < mínimo (mínimo zero desliga) e resolve sozinho quando o saldo volta.
- Nada é apagado: erro se corrige com `estornar_movimentacao`, que cria a movimentação oposta no mesmo lote. Estorno de entrada só é aceito se o lote ainda tiver o saldo; estorno de estorno é recusado.

Casos de referência: Anexo A da spec (B1, B2), reproduzidos em `src/dominio/estoque/estoque.test.ts` e `testes/integracao/estoque.test.ts`.

## Custos e preço (Fase 4)

- Fórmulas e casos de referência: `docs/formulas-de-custo.md` (fonte única). O motor é puro (`src/dominio/custos`, `src/dominio/precos`) e versionado (`VERSAO_MOTOR`).
- Parâmetros globais são versionados: editar cria versão com `vigente_desde`; a vigente é a mais recente até hoje. Nascem nulos e a calculadora fica bloqueada até tarifa, mão de obra e método de fixo existirem. Imposto sem valor bloqueia só o preço por canal.
- Componentes podem ser desligados pelo dono; entram como zero nos próximos cálculos e o snapshot guarda a lista de desligados.
- Impressora só entra na calculadora com todos os campos de custo preenchidos. Canal só forma preço com comissão, pagamento, ads, taxa fixa e frete subsidiado preenchidos (zero é um valor; vazio não é).
- O custo do filamento vem de `custoDeReposicao` do insumo (média, última compra ou manual) ou de um valor por quilo digitado na hora; o snapshot guarda o custo por grama e a origem fica implícita no insumo escolhido.
- Salvar cálculo: o servidor recalcula a partir das entradas e grava entradas, resultado, versão do motor e dos parâmetros. Nada é alterado depois; o histórico compara o custo do filamento do snapshot com o atual e marca o que vale revisar. Recálculo em lote e alerta `margem_reduzida` por produto chegam na Fase 5, com BOM e preço por canal.

As regras de produtos, pedidos e financeiro estão na spec (seções 5.5 a 5.7) e entram aqui quando forem implementadas.
